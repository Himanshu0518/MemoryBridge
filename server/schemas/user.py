from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import Optional


class UserCreatePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, example="Himanshu Singh")
    email: EmailStr = Field(..., example="himanshu@example.com")
    password: str = Field(..., min_length=6, max_length=50)
    confirm_password: str = Field(..., min_length=6, max_length=50)

    @model_validator(mode="after")
    def validate_passwords(cls, values):
        if values.password != values.confirm_password:
            raise ValueError("Passwords do not match")
        return values


class UserLoginPayload(BaseModel):
    email: EmailStr = Field(..., example="himanshu@example.com")
    password: str = Field(..., min_length=6, max_length=50)


class UserUpdatePayload(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100, example="Himanshu Singh")
    age: Optional[int] = Field(None, ge=0, le=120, example=30)


class ChangePasswordPayload(BaseModel):
    current_password: str = Field(..., min_length=6, max_length=50)
    new_password: str = Field(..., min_length=6, max_length=50)
    confirm_new_password: str = Field(..., min_length=6, max_length=50)

    @model_validator(mode="after")
    def validate_new_passwords(cls, values):
        if values.new_password != values.confirm_new_password:
            raise ValueError("New passwords do not match")
        return values


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    age: Optional[int]
    role: str

    class Config:
        from_attributes = True
