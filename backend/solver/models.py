from pydantic import BaseModel
from typing import Optional, Literal


class RouteRequest(BaseModel):
    mode: Literal["static", "dynamic"]
    zone: Literal["All", "East", "West"]
    threshold: int
    truckLabel: str
    truckCapacityKg: int
    shiftStart: str
    shiftEnd: str
    goal: Literal["distance", "time", "overflow"]
    autoSelect: bool
    manualBinId: Optional[str] = None