from math import radians, sin, cos, sqrt, asin
from ortools.constraint_solver import pywrapcp, routing_enums_pb2

BINS = [
    {"id": "BIN-001", "placeName": "Library", "side": "East", "lat": 26.394162, "lng": 50.190043, "current_fill": 35, "fill_rate_pctph": 0.4, "hours_since_last_collect": 20},
    {"id": "BIN-002", "placeName": "Supermarket", "side": "East", "lat": 26.399964, "lng": 50.199170, "current_fill": 82, "fill_rate_pctph": 1.1, "hours_since_last_collect": 36},
    {"id": "BIN-003", "placeName": "Dinning Halls", "side": "East", "lat": 26.397525, "lng": 50.190432, "current_fill": 67, "fill_rate_pctph": 0.8, "hours_since_last_collect": 30},
    {"id": "BIN-004", "placeName": "Supportive Deanships", "side": "East", "lat": 26.393412, "lng": 50.191372, "current_fill": 91, "fill_rate_pctph": 1.3, "hours_since_last_collect": 52},
    {"id": "BIN-005", "placeName": "Students Housing - Males", "side": "East", "lat": 26.400662, "lng": 50.199627, "current_fill": 54, "fill_rate_pctph": 0.6, "hours_since_last_collect": 18},
    {"id": "BIN-006", "placeName": "College of CS & IT - Female", "side": "West", "lat": 26.385763, "lng": 50.188514, "current_fill": 76, "fill_rate_pctph": 0.9, "hours_since_last_collect": 26},
    {"id": "BIN-007", "placeName": "Family & Community Medicine Center", "side": "West", "lat": 26.378264, "lng": 50.190702, "current_fill": 43, "fill_rate_pctph": 0.3, "hours_since_last_collect": 16},
    {"id": "BIN-008", "placeName": "Orientation Studies - Male", "side": "West", "lat": 26.385600, "lng": 50.185780, "current_fill": 88, "fill_rate_pctph": 1.0, "hours_since_last_collect": 40},
    {"id": "BIN-009", "placeName": "College of Basic Medical Sciences", "side": "West", "lat": 26.379642, "lng": 50.192736, "current_fill": 61, "fill_rate_pctph": 0.7, "hours_since_last_collect": 28},
    {"id": "BIN-010", "placeName": "College of Design", "side": "West", "lat": 26.392007, "lng": 50.185054, "current_fill": 95, "fill_rate_pctph": 1.4, "hours_since_last_collect": 54},
]

BIN_CAPACITY_KG = 440
TRUCK_CAPACITY_KG_DEFAULT = 2500
SERVICE_TIME_BIN_MIN = 3
MAX_ROUTE_DURATION_MIN = 120
MAX_STOPS_PER_TRIP = 6
MAX_TRIPS = 4
CAMPUS_SPEED_KMPH = 20
OVERDUE_HOURS = 48
DEPOT = {"lat": 26.3898, "lng": 50.1905}

def haversine_km(a_lat, a_lng, b_lat, b_lng):
    r = 6371.0
    d_lat = radians(b_lat - a_lat)
    d_lng = radians(b_lng - a_lng)
    x = sin(d_lat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(d_lng / 2) ** 2
    return 2 * r * asin(sqrt(x))

def travel_min(distance_km):
    return round((distance_km / CAMPUS_SPEED_KMPH) * 60)

def demand_kg(fill_pct):
    return round((fill_pct / 100.0) * BIN_CAPACITY_KG)

def risk_label(fill_pct):
    if fill_pct >= 80: return "High"
    if fill_pct >= 60: return "Medium"
    return "Low"

def eta_from_minutes(start_time, minutes_to_add):
    h, m = map(int, start_time.split(":"))
    total = h * 60 + m + minutes_to_add
    hh24 = (total // 60) % 24
    mm = total % 60
    suffix = "PM" if hh24 >= 12 else "AM"
    hh12 = 12 if hh24 % 12 == 0 else hh24 % 12
    return f"{hh12:02d}:{mm:02d} {suffix}"

def normalize_positions(candidates):
    if not candidates: return {}
    lats = [b["lat"] for b in candidates]; lngs = [b["lng"] for b in candidates]
    min_lat, max_lat = min(lats), max(lats); min_lng, max_lng = min(lngs), max(lngs)
    lat_range = max(max_lat - min_lat, 1e-9); lng_range = max(max_lng - min_lng, 1e-9)
    out = {}
    for b in candidates:
        left_pct = 12 + ((b["lng"] - min_lng) / lng_range) * 70
        top_pct = 12 + (1 - (b["lat"] - min_lat) / lat_range) * 70
        out[b["id"]] = {"leftPct": round(left_pct, 1), "topPct": round(top_pct, 1)}
    return out

def add_ai_features(rows):
    enriched = []
    for r in rows:
        item = dict(r); item["campus"] = item["side"].lower()
        item["pred_fill_12h"] = min(item["current_fill"] + item["fill_rate_pctph"] * 12, 100.0)
        proxy_risk = 0.55*(item["pred_fill_12h"]/100.0)+0.25*(item["current_fill"]/100.0)+0.20*min(item["fill_rate_pctph"]/2.0,1.0)
        item["pred_risk_12h"] = round(min(max(proxy_risk,0.0),1.0),4)
        item["overdue"] = item["hours_since_last_collect"] >= OVERDUE_HOURS
        item["demand_kg"] = demand_kg(item["current_fill"])
        if item["overdue"] or item["current_fill"] >= 70: item["priority_class"]="MUST"
        elif item["pred_fill_12h"] >= 65 or item["pred_risk_12h"] >= 0.50: item["priority_class"]="SHOULD"
        else: item["priority_class"]="OPTIONAL"
        enriched.append(item)
    return enriched

def build_candidates(payload, scoped):
    threshold = int(payload["threshold"]); mode = payload["mode"].upper(); goal = payload["goal"]; auto_select = payload["autoSelect"]; manual_bin_id = payload.get("manualBinId")
    if not auto_select:
        manual = [b for b in scoped if b["id"] == manual_bin_id]
        return {"must_bins": manual, "optional_bins": []}
    if mode == "STATIC":
        must_bins = [b for b in scoped if b["current_fill"] >= threshold]
        return {"must_bins": must_bins, "optional_bins": []}
    must_now = [b for b in scoped if b["current_fill"] >= threshold]
    must_predicted = [b for b in scoped if b["current_fill"] < threshold and b["pred_fill_12h"] >= threshold]
    must_overdue = [b for b in scoped if b["overdue"]]
    optional_bins = []
    if goal == "overflow":
        optional_bins = [b for b in scoped if (threshold - 10) <= b["current_fill"] < threshold and b["pred_risk_12h"] >= 0.45 and not b["overdue"] and b["pred_fill_12h"] < threshold]
        optional_bins = sorted(optional_bins, key=lambda x: (x["pred_risk_12h"], x["pred_fill_12h"], x["current_fill"]), reverse=True)[:2]
    must_map = {}; [must_map.__setitem__(b["id"], b) for b in must_now + must_predicted + must_overdue]
    optional_map = {}; [optional_map.__setitem__(b["id"], b) for b in optional_bins if b["id"] not in must_map]
    return {"must_bins": list(must_map.values()), "optional_bins": list(optional_map.values())}

def add_priority_score(rows, goal):
    out=[]; pr_map={"MUST":2,"SHOULD":1,"OPTIONAL":0}
    for b in rows:
        x=dict(b); x["priority_rank"]=pr_map.get(x["priority_class"],0)
        if goal=="overflow":
            x["priority_score"] = 1.20*x["pred_fill_12h"] + 1.10*x["pred_risk_12h"]*100 + 0.50*x["current_fill"] + 6.0*x["priority_rank"]
        elif goal=="time":
            x["priority_score"] = 0.70*x["current_fill"] + 0.80*x["pred_fill_12h"] + 0.40*x["pred_risk_12h"]*100 + 5.0*x["priority_rank"]
        else:
            x["priority_score"] = 1.00*x["current_fill"] + 0.50*x["pred_fill_12h"] + 0.30*x["pred_risk_12h"]*100 + 4.0*x["priority_rank"]
        out.append(x)
    return out

def build_distance_matrix(nodes):
    return [[int(round(haversine_km(a["lat"], a["lng"], b["lat"], b["lng"]) * 1000)) for b in nodes] for a in nodes]

def build_time_matrix(nodes):
    matrix=[]
    for i,a in enumerate(nodes):
        row=[]
        for j,b in enumerate(nodes):
            if i==j: row.append(0); continue
            km=haversine_km(a["lat"], a["lng"], b["lat"], b["lng"]); t=travel_min(km)
            if i!=0: t += SERVICE_TIME_BIN_MIN
            row.append(int(round(t)))
        matrix.append(row)
    return matrix

def solve_single_trip(payload, candidates):
    if not candidates: return {"visited_bins":[],"total_distance_km":0.0,"total_time_min":0,"current_load_kg":0}
    nodes=[{"id":"DEPOT","lat":DEPOT["lat"],"lng":DEPOT["lng"],"current_fill":0,"placeName":"Depot","side":"Depot","demand_kg":0,"priority_score":0,"mandatory":False}] + candidates
    distance_matrix=build_distance_matrix(nodes); time_matrix=build_time_matrix(nodes); demands=[0]+[b["demand_kg"] for b in candidates]
    manager=pywrapcp.RoutingIndexManager(len(nodes),1,0); routing=pywrapcp.RoutingModel(manager)
    def distance_callback(from_index,to_index):
        f=manager.IndexToNode(from_index); t=manager.IndexToNode(to_index); return distance_matrix[f][t]
    def time_callback(from_index,to_index):
        f=manager.IndexToNode(from_index); t=manager.IndexToNode(to_index); return time_matrix[f][t]
    def demand_callback(from_index):
        f=manager.IndexToNode(from_index); return demands[f]
    distance_cb_idx=routing.RegisterTransitCallback(distance_callback); time_cb_idx=routing.RegisterTransitCallback(time_callback); demand_cb_idx=routing.RegisterUnaryTransitCallback(demand_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(distance_cb_idx)
    routing.AddDimension(time_cb_idx,0,MAX_ROUTE_DURATION_MIN,True,"Time")
    routing.AddDimensionWithVehicleCapacity(demand_cb_idx,0,[int(payload.get("truckCapacityKg", TRUCK_CAPACITY_KG_DEFAULT))],True,"Capacity")
    routing.AddConstantDimension(1,MAX_STOPS_PER_TRIP+1,True,"Stops")
    for i,b in enumerate(candidates,start=1):
        index=manager.NodeToIndex(i)
        penalty=int(300000 + (b["priority_score"]*1000)) if b.get("mandatory",False) else int(15000 + (b["priority_score"]*200))
        routing.AddDisjunction([index], penalty)
    search=pywrapcp.DefaultRoutingSearchParameters()
    search.first_solution_strategy=routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search.local_search_metaheuristic=routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search.time_limit.seconds=2
    solution=routing.SolveWithParameters(search)
    if solution is None: return {"visited_bins":[],"total_distance_km":0.0,"total_time_min":0,"current_load_kg":0}
    visited=[]; total_distance_m=0; total_time_min=0; index=routing.Start(0)
    while not routing.IsEnd(index):
        next_index=solution.Value(routing.NextVar(index)); from_node=manager.IndexToNode(index); to_node=manager.IndexToNode(next_index)
        if to_node != 0: visited.append(candidates[to_node-1])
        total_distance_m += distance_matrix[from_node][to_node]; total_time_min += time_matrix[from_node][to_node]; index=next_index
    current_load_kg=sum(b["demand_kg"] for b in visited)
    return {"visited_bins":visited,"total_distance_km":round(total_distance_m/1000.0,2),"total_time_min":int(round(total_time_min)),"current_load_kg":current_load_kg}

def solve_multi_trip(payload, must_bins, optional_bins):
    remaining_must=[dict(b, mandatory=True) for b in must_bins]; remaining_optional=[dict(b, mandatory=False) for b in optional_bins]
    all_visited=[]; total_distance_km=0.0; total_time_min=0; total_load_kg=0; trip_count=0
    while trip_count < MAX_TRIPS:
        trip_count += 1
        candidates=remaining_must + remaining_optional
        if not candidates: break
        trip=solve_single_trip(payload, candidates); visited=trip["visited_bins"]
        if not visited: break
        all_visited.extend(visited); total_distance_km += trip["total_distance_km"]; total_time_min += trip["total_time_min"]; total_load_kg += trip["current_load_kg"]
        visited_ids={b["id"] for b in visited}
        remaining_must=[b for b in remaining_must if b["id"] not in visited_ids]; remaining_optional=[b for b in remaining_optional if b["id"] not in visited_ids]
        if not remaining_must: break
    return {"visited_bins":all_visited,"total_distance_km":round(total_distance_km,2),"total_time_min":total_time_min,"current_load_kg":total_load_kg}

def solve_route(payload: dict):
    zone=payload["zone"]; mode=payload["mode"].upper(); goal=payload["goal"]; shift_start=payload["shiftStart"]; truck_capacity_kg=int(payload.get("truckCapacityKg", TRUCK_CAPACITY_KG_DEFAULT))
    scoped=[dict(b) for b in BINS if zone=="All" or b["side"]==zone]; snapshot=add_ai_features(scoped)
    candidate_sets=build_candidates(payload, snapshot)
    must_bins=add_priority_score(candidate_sets["must_bins"], goal); optional_bins=add_priority_score(candidate_sets["optional_bins"], goal); all_candidate_bins=must_bins+optional_bins
    pos_map=normalize_positions(snapshot if snapshot else all_candidate_bins)
    plan=solve_multi_trip(payload, must_bins, optional_bins); visited=plan["visited_bins"]
    route_stops=[]; driver_stops=[]; elapsed=0; cur_lat=DEPOT["lat"]; cur_lng=DEPOT["lng"]
    for idx,b in enumerate(visited,start=1):
        leg_km=haversine_km(cur_lat, cur_lng, b["lat"], b["lng"]); leg_min=travel_min(leg_km); elapsed += leg_min + SERVICE_TIME_BIN_MIN
        pos=pos_map.get(b["id"], {"leftPct":20 + idx*8, "topPct":20 + idx*7})
        route_stops.append({"id":str(idx),"binId":b["id"],"fillPct":round(b["current_fill"],1),"forecastPct":round(b["pred_fill_12h"],1),"eta":eta_from_minutes(shift_start, int(round(elapsed))),"fillInHours":"Now" if mode=="DYNAMIC" else "Scheduled","risk":risk_label(b["current_fill"]),"priority":idx,"topPct":pos["topPct"],"leftPct":pos["leftPct"]})
        driver_stops.append({"id":f"stop-{idx}","binId":b["id"],"placeName":b["placeName"],"fillPct":round(b["current_fill"],1),"distanceKm":round(leg_km,2),"etaMin":int(round(elapsed)),"address":f"{b['placeName']}, {b['side']} Campus, IAU","lat":b["lat"],"lng":b["lng"],"status":"current" if idx==1 else "pending"})
        cur_lat=b["lat"]; cur_lng=b["lng"]
    avg_fill=round(sum(b["current_fill"] for b in snapshot)/len(snapshot),2) if snapshot else 0
    return {"kpis":{"totalActiveBins":len(snapshot),"binsAbove80":len([b for b in snapshot if b["current_fill"] >= 80]),"selectedBins":len(route_stops),"averageFillLevel":avg_fill,"overThreshold":len(all_candidate_bins)},"summary":{"totalBins":len(route_stops),"totalDistanceKm":plan["total_distance_km"],"estimatedTimeMin":plan["total_time_min"],"overflowPrevented":len(route_stops)},"routeStops":route_stops,"driverRoute":{"routeId":f"{mode}-ROUTE-001","totalStops":len(driver_stops),"estDuration":f"{plan['total_time_min']//60}h {plan['total_time_min']%60}m","binsToCollect":len(driver_stops),"truckCapacityPct":round((plan["current_load_kg"]/truck_capacity_kg)*100) if truck_capacity_kg else 0,"stops":driver_stops}}
