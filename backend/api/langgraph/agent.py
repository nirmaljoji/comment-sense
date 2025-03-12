from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langchain_core.messages import SystemMessage
from langgraph.errors import NodeInterrupt
from langchain_core.tools import BaseTool
from pydantic import BaseModel
from langchain_mcp_adapters.client import MultiServerMCPClient
from .tools import tools
from .state import AgentState
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

model = ChatOpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
    model="gpt-4"
)


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
                "webscraping": {
                    "command": "python",
                    "args": ["-m", "mcp_server_fetch"],
                    "transport": "stdio",
                }
            }
        )
        await mcp_client.__aenter__()
    return mcp_client


def get_tool_defs(config):
    frontend_tools = [
        {"type": "function", "function": tool}
        for tool in config["configurable"]["frontend_tools"]
    ]
    
    # Get MCP tool definitions - we'll use a synchronous approach here
    # since tool_defs shouldn't be async
    mcp_tool_defs = []
    if mcp_client:
        mcp_tool_defs = mcp_client.get_tools()
    
    return tools + frontend_tools + mcp_tool_defs


async def get_tools(config):
    # Initialize MCP client if not already done
    client = await initialize_mcp_client()
    
    frontend_tools = [
        FrontendTool(tool.name) for tool in config["configurable"]["frontend_tools"]
    ]

    # Get MCP tools
    mcp_tools = client.get_tools() if client else []

    return tools + frontend_tools + mcp_tools


async def call_model(state, config):
    system = config.get("configurable", {}).get("system", "You are Comment Sense, an assistant to help analyze course evaluations")
    print("Config:" + str(system))
    # Make sure MCP client is initialized
    await initialize_mcp_client()
    
    # Format the system message content as an object with type and text fields
    system_message = SystemMessage(content=[{"type": "text", "text": system}])
    messages = [system_message] + state["messages"]
    model_with_tools = model.bind_tools(get_tool_defs(config))
    response = await model_with_tools.ainvoke(messages)
    # We return a list, because this will get added to the existing list
    return {"messages": [response]}  # Make sure this is a list


async def run_tools(state, config, **kwargs):
    """Process tool calls from the model's response"""
    messages = state["messages"]
    last_message = messages[-1]
    
    # Debug logging to see what's happening
    print(f"Tool calls: {last_message.tool_calls}")
    
    # Initialize tool_node with the tools
    tool_node = ToolNode(await get_tools(config))
    
    # Pass the entire state to the tool_node
    tool_results = await tool_node.ainvoke(state, config, **kwargs)
    
    return tool_results


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