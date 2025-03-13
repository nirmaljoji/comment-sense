import os
from pymongo import MongoClient
from pymongo.operations import SearchIndexModel
from dotenv import load_dotenv
from ..utils.logger import logger

load_dotenv()

class MongoDB:
    client: MongoClient = None
    db = None

    @classmethod
    def connect_db(cls):
        try:
            mongodb_url = os.getenv("MONGODB_URL")
            database_name = os.getenv("DATABASE_NAME")
            
            cls.client = MongoClient(mongodb_url)
            cls.db = cls.client[database_name]
            
            # Create vector index if it doesn't exist
            cls._ensure_evaluations_vector_index()
            logger.info("Mongo Check Complete")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise

    @classmethod
    def _ensure_evaluations_vector_index(cls):
        """Ensure vector index exists for similarity search"""
        try:
            collection = cls.db.evaluations_vectors
            
            # Create collection if it doesn't exist
            if "evaluations_vectors" not in cls.db.list_collection_names():
                cls.db.create_collection("evaluations_vectors")
                logger.info("Created evaluations_vectors collection")
            
            # Check if index exists
            indexes = list(collection.list_indexes())
            index_exists = any(index.get("name") == "evaluations_index" for index in indexes)
            
            if not index_exists:
                # Create vector index using SearchIndexModel
                search_index_model = SearchIndexModel(
                    definition={
                        "fields": [
                            {
                                "type": "vector",
                                "numDimensions": 1536,
                                "path": "embedding",
                                "similarity": "cosine"
                            },
                            {
                                "path": "chat_id",
                                "type": "filter"
                            }
                        ]
                    },
                    name="evaluations_index",
                    type="vectorSearch"
                )
                
                result = collection.create_search_index(model=search_index_model)
                logger.info(f"Created vector index in MongoDB: {result}")
            else:
                logger.info("Vector index 'evaluations_index' already exists")

        except Exception as e:
            # If the error is about index already existing, log it as info instead of error
            if "Index already exists" in str(e) or "IndexAlreadyExists" in str(e):
                logger.info(f"Vector index already exists: {e}")
            else:
                logger.error(f"Failed to create vector index: {e}")
                raise

    @classmethod
    def close_db(cls):
        if cls.client:
            cls.client.close()
            logger.info("Closed MongoDB connection")

    @classmethod
    def get_db(cls):
        return cls.db 