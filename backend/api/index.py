from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from .langgraph.agent import assistant_ui_graph
from .routes.add_langgraph_route import add_langgraph_route
from .database.mongodb import MongoDB
from .routes.file_routes import router as file_router
from .routes.auth_routes import router as auth_router
from .utils.logger import logger

app = FastAPI()

@app.on_event("startup")
def startup_db_client():
    MongoDB.connect_db()

@app.on_event("shutdown")
def shutdown_db_client():
    MongoDB.close_db()

# CORS configuration - update with your frontend URL in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL(s)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add routes
add_langgraph_route(app, assistant_ui_graph, "/api/chat")
app.include_router(file_router, prefix="/api/files", tags=["files"])
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
