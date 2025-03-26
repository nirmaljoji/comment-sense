from fastapi import APIRouter, Depends, HTTPException, status
from ..models.feedback import FeedbackModel
from ..utils.logger import logger
from langfuse import Langfuse
from ..models.user import UserInDB
from ..utils.deps import get_current_user
import uuid
router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def submit_feedback(feedback: FeedbackModel , current_user: UserInDB = Depends(get_current_user)):
    """
    Submit user feedback for an assistant response
    
    For now, this just logs the feedback to the console
    In a production environment, this would store the feedback in a database
    """
    # Log the feedback to the console
    logger.info(f"Received feedback: {feedback.dict()}")

    langfuse_client = Langfuse()
    
    traces = langfuse_client.fetch_traces(
        limit=1,
        user_id=current_user.email,
        order_by="timestamp.desc",  # Get the most recent trace
    )
    
    trace_id = None
    
    if traces.data and len(traces.data) > 0:
        # User has an existing trace
        trace_id = traces.data[0].id
        logger.info(f"Found latest trace: {trace_id}")
    else:
        # User does not have a trace, create a new one
        session_id = str(uuid.uuid4())
        trace = langfuse_client.trace(
            name="feedback_standalone",
            user_id=current_user.email,
            session_id=session_id
        )
        trace_id = trace.id
        logger.info(f"Created new trace: {trace_id}")

    langfuse_client.score(
        name="feedback",
        trace_id=trace_id,
        value=feedback.rating,  
        comment=feedback.feedback_text,
    )
    
    # Here you would typically store the feedback in a database
    # For example:
    # await db.feedback.insert_one(feedback.dict())

    return {"status": "success", "message": "Feedback received successfully"}

