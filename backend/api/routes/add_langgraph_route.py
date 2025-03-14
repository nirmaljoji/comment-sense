from assistant_stream import create_run, RunController
from assistant_stream.serialization import DataStreamResponse
from langchain_core.messages import (
    HumanMessage,
    AIMessageChunk,
    AIMessage,
    ToolMessage,
    SystemMessage,
    BaseMessage,
)
from fastapi import FastAPI, Header
from pydantic import BaseModel
from typing import List, Literal, Union, Optional, Any
from ..utils.deps import get_current_user
from ..models.user import UserInDB
from fastapi import Depends, HTTPException, status
from ..database.mongodb import MongoDB
from bson import ObjectId

class LanguageModelTextPart(BaseModel):
    type: Literal["text"]
    text: str
    providerMetadata: Optional[Any] = None


class LanguageModelImagePart(BaseModel):
    type: Literal["image"]
    image: str  # Will handle URL or base64 string
    mimeType: Optional[str] = None
    providerMetadata: Optional[Any] = None


class LanguageModelFilePart(BaseModel):
    type: Literal["file"]
    data: str  # URL or base64 string
    mimeType: str
    providerMetadata: Optional[Any] = None


class LanguageModelToolCallPart(BaseModel):
    type: Literal["tool-call"]
    toolCallId: str
    toolName: str
    args: Any
    providerMetadata: Optional[Any] = None


class LanguageModelToolResultContentPart(BaseModel):
    type: Literal["text", "image"]
    text: Optional[str] = None
    data: Optional[str] = None
    mimeType: Optional[str] = None


class LanguageModelToolResultPart(BaseModel):
    type: Literal["tool-result"]
    toolCallId: str
    toolName: str
    result: Any
    isError: Optional[bool] = None
    content: Optional[List[LanguageModelToolResultContentPart]] = None
    providerMetadata: Optional[Any] = None


class LanguageModelSystemMessage(BaseModel):
    role: Literal["system"]
    content: str


class LanguageModelUserMessage(BaseModel):
    role: Literal["user"]
    content: List[
        Union[LanguageModelTextPart, LanguageModelImagePart, LanguageModelFilePart]
    ]


class LanguageModelAssistantMessage(BaseModel):
    role: Literal["assistant"]
    content: List[Union[LanguageModelTextPart, LanguageModelToolCallPart]]


class LanguageModelToolMessage(BaseModel):
    role: Literal["tool"]
    content: List[LanguageModelToolResultPart]


LanguageModelV1Message = Union[
    LanguageModelSystemMessage,
    LanguageModelUserMessage,
    LanguageModelAssistantMessage,
    LanguageModelToolMessage,
]


def convert_to_langchain_messages(
    messages: List[LanguageModelV1Message],
) -> List[BaseMessage]:
    result = []

    for msg in messages:
        if msg.role == "system":
            result.append(SystemMessage(content=msg.content))

        elif msg.role == "user":
            content = []
            for p in msg.content:
                if isinstance(p, LanguageModelTextPart):
                    content.append({"type": "text", "text": p.text})
                elif isinstance(p, LanguageModelImagePart):
                    content.append({"type": "image_url", "image_url": p.image})
            result.append(HumanMessage(content=content))

        elif msg.role == "assistant":
            # Handle both text and tool calls
            text_parts = [
                p for p in msg.content if isinstance(p, LanguageModelTextPart)
            ]
            text_content = " ".join(p.text for p in text_parts)
            tool_calls = [
                {
                    "id": p.toolCallId,
                    "name": p.toolName,
                    "args": p.args,
                }
                for p in msg.content
                if isinstance(p, LanguageModelToolCallPart)
            ]
            result.append(AIMessage(content=text_content, tool_calls=tool_calls))

        elif msg.role == "tool":
            for tool_result in msg.content:
                result.append(
                    ToolMessage(
                        content=str(tool_result.result),
                        tool_call_id=tool_result.toolCallId,
                    )
                )

    return result


class FrontendToolCall(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: dict[str, Any]


class ChatRequest(BaseModel):
    system: Optional[str] = ""
    tools: Optional[List[FrontendToolCall]] = []
    messages: List[LanguageModelV1Message]


def add_langgraph_route(app: FastAPI, graph, path: str, current_user: UserInDB = Depends(get_current_user)):
   
    SYSTEM_MESSAGE = """
        # Professor's Teaching Assistant AI Agent

    You are an expert teaching assistant AI designed to help professors analyze course evaluations and improve their teaching methods. Your primary goal is to provide actionable insights and research-backed recommendations that enhance teaching effectiveness and student learning outcomes.

    ## Your Capabilities

    1. **get_evaluations_context**: You can analyze course evaluation data to identify patterns, strengths, and opportunities for improvement.

    2. **get_teaching_material_context**: You have access to "Teaching at Its Best," a comprehensive textbook on effective teaching practices in higher education, which you can reference to provide targeted advice. Do not use information from anywhere else.

    3. **fetch**: Only use this tool if the user has provided with a URL in the prompt.

    ## How You Operate

    When a professor shares course evaluation data with you:

    1. If the prompt is about the course evaluations then analyze the evaluations carefully to identify key themes, strengths, and areas for improvement.

    2. For each area that needs improvement, retrieve relevant guidance from get_teaching_material_context tool to provide research-backed recommendations.

    3. When appropriate, supplement this information with fetch tool.

    4. Present your insights in a clear, organized manner with specific, actionable steps the professor can take to improve.

    5. Maintain a supportive, constructive tone that acknowledges teaching strengths while suggesting improvements.

    ## Interaction Guidelines

    - Always respond with empathy and understanding of the challenges professors face.
    - Frame feedback positively as opportunities for growth rather than criticisms.
    - Provide specific, concrete examples when suggesting teaching strategies.
    - When making recommendations, explain the research or principles behind them.
    - Prioritize quality over quantity in your recommendations—focus on the most impactful changes first.
    - Adjust your recommendations based on the professor's teaching context (discipline, class size, level, format, etc.).

    ## Special Instructions

    - When analyzing evaluations, look for both explicit feedback and implied concerns in student comments.
    - Use only get_teaching_material_context tool for recommending new teaching strategies and tips
    - For sensitive issues (like very negative feedback), balance honesty with constructiveness and offer particularly supportive guidance.

    You exist to help professors become more effective educators. Your ultimate measure of success is improved teaching practices that lead to better student learning outcomes.
        
    """
   
    async def chat_completions(request: ChatRequest, x_chat_id: Optional[str] = Header(None, alias="X-Chat-ID"), current_user: dict = Depends(get_current_user)):
        inputs = convert_to_langchain_messages(request.messages)

                # Check and update request count
        db = MongoDB.get_db()
        user = db.users.find_one({"_id": ObjectId(current_user.id)})
        
        if user["requests_used"] >= user["requests_limit"]:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Request limit exceeded"
            )
            
        # Increment request count
        db.users.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$inc": {"requests_used": 1}}
        )
        
        inputs = convert_to_langchain_messages(request.messages)
        system_msg = SystemMessage(content=SYSTEM_MESSAGE)
        all_messages = [system_msg] + inputs

        async def run(controller: RunController):
            tool_calls = {}
            tool_calls_by_idx = {}

            async for msg, metadata in graph.astream(
                {"messages": all_messages},
                {
                    "configurable": {
                        "system": request.system,
                        "frontend_tools": request.tools,
                        "metadata": {
                            "langfuse_session_id": x_chat_id,
                            "current_user": current_user.email,
                            "current_id": current_user.id
                        }
                    }
                },
                stream_mode="messages",
            ):
                if isinstance(msg, ToolMessage):
                    tool_controller = tool_calls.get(msg.tool_call_id)
                    if tool_controller is None:
                        # The MCP tool may send a ToolMessage before its call is registered.
                        # Register a fallback tool call using "MCP" (or an appropriate tool name) as a default.
                        tool_controller = await controller.add_tool_call("MCP", msg.tool_call_id)
                        tool_calls[msg.tool_call_id] = tool_controller
                    tool_controller.set_result(msg.content)

                if isinstance(msg, AIMessageChunk) or isinstance(msg, AIMessage):
                    if msg.content:
                        controller.append_text(msg.content)

                    for chunk in msg.tool_call_chunks:
                        if not chunk["index"] in tool_calls_by_idx:
                            tool_controller = await controller.add_tool_call(
                                chunk["name"], chunk["id"]
                            )
                            tool_calls_by_idx[chunk["index"]] = tool_controller
                            tool_calls[chunk["id"]] = tool_controller
                        else:
                            tool_controller = tool_calls_by_idx[chunk["index"]]

                        tool_controller.append_args_text(chunk["args"])

        return DataStreamResponse(create_run(run))

    app.add_api_route(path, chat_completions, methods=["POST"])