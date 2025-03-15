from langchain_openai import ChatOpenAI
from typing_extensions import Literal, TypedDict, Dict, List, Any, Union, Optional
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage
from langgraph.errors import NodeInterrupt
from langchain_core.tools import BaseTool
from pydantic import BaseModel
from .tools import tools
from .state import AgentState
from langchain_mcp_adapters.client import MultiServerMCPClient
import os
import sys

model = ChatOpenAI(model="gpt-4o")


# Get the path to the Python interpreter in the current environment
if os.environ.get("NODE_ENV") == "production":
    # On Render
    python_path = "/opt/render/project/src/.venv/bin/python"
else:
    # Local development - use current Python interpreter
    python_path = sys.executable
# Initialize MCP client # Define the connection type structures
class StdioConnection(TypedDict):
    command: str
    args: List[str]
    transport: Literal["stdio"]

class SSEConnection(TypedDict):
    url: str
    transport: Literal["sse"]


MCPConfig = Dict[str, Union[StdioConnection, SSEConnection]]

DEFAULT_MCP_CONFIG: MCPConfig = {
    "webscraping": {
            "command": "python",
            "args": ["-m", "mcp_server_fetch"],
            "transport": "stdio",
     }
}


def should_continue(state):
    messages = state["messages"]
    last_message = messages[-1]
    if not last_message.tool_calls:
        return END
    else:
        return "tools"


class AnyArgsSchema(BaseModel):
    # By not defining any fields and allowing extras,
    # this schema will accept any input passed in.
    class Config:
        extra = "allow"


class FrontendTool(BaseTool):
    def __init__(self, name: str):
        super().__init__(name=name, description="", args_schema=AnyArgsSchema)

    def _run(self, *args, **kwargs):
        # Since this is a frontend-only tool, it might not actually execute anything.
        # Raise an interrupt or handle accordingly.
        raise NodeInterrupt("This is a frontend tool call")

    async def _arun(self, *args, **kwargs) -> str:
        # Similarly handle async calls
        raise NodeInterrupt("This is a frontend tool call")


# Initialize MCP client outside of functions to maintain the connection
mcp_client = None


async def initialize_mcp_client():
    """Initialize the MCP client if not already initialized"""
    global mcp_client
    if mcp_client is None:
        mcp_client = MultiServerMCPClient(
            {
                "fetch": {
                    "command": "python",
                    "args": ["-m", "mcp_server_fetch"],
                    "transport": "stdio",
                }
            }
        )
        await mcp_client.__aenter__()
    return mcp_client


async def get_tool_defs(config):
    """Get tool definitions including MCP tools."""
    frontend_tools = [
        {"type": "function", "function": tool}
        for tool in config["configurable"]["frontend_tools"]
    ]
    
    # Initialize MCP client if not already done
    client = await initialize_mcp_client()
    
    # Get MCP tool definitions
    mcp_tool_defs = client.get_tools() if client else []
    
    return tools + frontend_tools + mcp_tool_defs


async def get_tools(config):
    """Get tool instances including MCP tools."""
    # Initialize MCP client if not already done
    client = await initialize_mcp_client()
    
    frontend_tools = [
        FrontendTool(tool.name) for tool in config["configurable"]["frontend_tools"]
    ]
    
    # We return the tools without MCP tools because the MCP tools are handled separately
    return tools + frontend_tools + client.get_tools()


async def call_model(state, config):
    system = config["configurable"]["system"]

    messages = [SystemMessage(content=system)] + state["messages"]
    tool_defs = await get_tool_defs(config)
    model_with_tools = model.bind_tools(tool_defs)
    response = await model_with_tools.ainvoke(messages)
    # We return a list, because this will get added to the existing list
    return {"messages": [response]}


async def run_tools(state, config, **kwargs):
    """Process tool calls from the model's response"""
    tool_node = ToolNode(await get_tools(config))
    return await tool_node.ainvoke(state, config, **kwargs)


# Define a new graph
workflow = StateGraph(AgentState)

workflow.add_node("agent", call_model)
workflow.add_node("tools", run_tools)
workflow.set_entry_point("agent")
workflow.add_conditional_edges(
    "agent",
    should_continue,
    ["tools", END],
)
workflow.add_edge("tools", "agent")
assistant_ui_graph = workflow.compile()


# Make sure to add proper cleanup for MCP client when your application shuts down
async def cleanup():
    global mcp_client
    if mcp_client is not None:
        await mcp_client.__aexit__(None, None, None)
        mcp_client = None