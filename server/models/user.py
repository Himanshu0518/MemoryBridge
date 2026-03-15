from sqlalchemy import Column, Integer, String
from server.config.db import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    age = Column(Integer, nullable=True)

    def __repr__(self):
        return f"<User(name={self.name}, email={self.email}, age={self.age})>"