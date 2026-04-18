from typing import Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from solver.optimizer import solve_route


app = FastAPI(title="BinTwin Route Solver")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SolveRouteRequest(BaseModel):
    mode: Literal["dynamic", "static"]
    zone: Literal["All", "East", "West"]
    threshold: int
    truckLabel: str
    truckCapacityKg: int
    shiftStart: str
    shiftEnd: str
    goal: Literal["distance", "time", "overflow"]
    autoSelect: bool
    manualBinId: Optional[str] = None
    forecastHorizon: Optional[str] = None


@app.get("/")
def root():
    return {"message": "BinTwin backend is running"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/solve-route")
def solve_route_endpoint(payload: SolveRouteRequest):
    try:
        return solve_route(payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# optional alias, in case you test another path later
@app.post("/optimize-route")
def optimize_route_endpoint(payload: SolveRouteRequest):
    try:
        return solve_route(payload.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))