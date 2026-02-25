from src.database.neo4j_manager import StorageManager

def wipe():
    sm = StorageManager()
    with sm.driver.session() as session:
        session.run("MATCH (n) DETACH DELETE n")
    print("Graph wiped clean. Ready for a pristine production run!")
    sm.close()

if __name__ == "__main__":
    wipe()