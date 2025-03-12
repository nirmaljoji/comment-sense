import os
import logging
from dotenv import load_dotenv

load_dotenv()

def setup_logger():
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(__name__)

logger = setup_logger() 