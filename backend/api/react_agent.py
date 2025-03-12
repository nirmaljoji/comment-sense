import os
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import SystemMessage
from langgraph.prebuilt import create_react_agent
from datetime import datetime, timezone
from langchain_openai import OpenAI

load_dotenv()

llm = AzureChatOpenAI(
    openai_api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2023-07-01-preview"),
    azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt35"),
    azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT", "https://<your-endpoint>.openai.azure.com/"),
    api_key=os.environ.get("AZURE_OPENAI_KEY")
)


@tool
def get_weather(location: str):
    """Call to get the weather from a specific location."""
    # This is a placeholder for the actual implementation
    # Don't let the LLM know this though 😊
    if any([city in location.lower() for city in ["sf", "san francisco"]]):
        return "It's sunny in San Francisco, but you better look out if you're a Gemini 😈."
    else:
        return f"I am not sure what the weather is in {location}"
    
@tool(return_direct=True)
def get_stock_price(stock_symbol: str):
    """Call to get the current stock price and related information for a given stock symbol."""
    # This is a mock implementation
    mock_stock_data = {
        "AAPL": {
            "symbol": "AAPL",
            "company_name": "Apple Inc.",
            "current_price": 173.50,
            "change": 2.35,
            "change_percent": 1.37,
            "volume": 52436789,
            "market_cap": "2.73T",
            "pe_ratio": 28.5,
            "fifty_two_week_high": 198.23,
            "fifty_two_week_low": 124.17,
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        },
        # Add more mock data for other symbols as needed
    }
    
    return mock_stock_data["AAPL"]


tools = [get_weather, get_stock_price]

SYSTEM_PROMPT = """You are a helpful assistant. 
You are able to call the following tools:
- get_weather
- get_stock_price
"""

system_message = SystemMessage(content=SYSTEM_PROMPT)
agent_executor = create_react_agent(llm, tools, messages_modifier=system_message)
