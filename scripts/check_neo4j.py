from src.database.neo4j_manager import StorageManager
import time

def check():
    print("Attempting to connect to Neo4j...")
    retries = 5
    for i in range(retries):
        try:
            sm = StorageManager()
            sm.verify_connection()
            sm.close()
            print("SUCCESS: Connected to Neo4j")
            return
        except Exception as e:
            print(f"Attempt {i+1}/{retries} failed: {e}")
            time.sleep(5)
    print("FAILURE: Could not connect to Neo4j after retries")

if __name__ == "__main__":
    check()
