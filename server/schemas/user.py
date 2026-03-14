from pydantic import BaseModel, Field, EmailStr, model_validator

class UserCreatePayload(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Full name of user",
        example="Himanshu Singh"
    )

    email: EmailStr = Field(
        ...,
        description="User email address",
        example="himanshu@example.com"
    )

    password: str = Field(
        ...,
        min_length=6,
        max_length=50,
        description="Password"
    )

    confirm_password: str = Field(
        ...,
        min_length=6,
        max_length=50,
        description="Confirm password"
    )
    
    @model_validator(mode="after")
    def validate_passwords(cls, values):
        if values.password != values.confirm_password:
            raise ValueError("Passwords do not match")
        return values



class UserCreateResponse(BaseModel):
    id: int
    name: str
    email: EmailStr

    class Config:
        from_attributes = True