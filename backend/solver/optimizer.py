from math import radians, sin, cos, sqrt, asin

import requests
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
TRUCK_CAPACITY_KG_DEFAULT = 1500
SERVICE_TIME_BIN_MIN = 3
LANDFILL_SERVICE_MIN = 15
MAX_ROUTE_DURATION_MIN = 120
MAX_STOPS_PER_TRIP = 6

CAMPUS_SPEED_KMPH = 20
OUTSIDE_SPEED_KMPH = 45
OVERDUE_HOURS = 48

# REPLACE THESE 2 WITH YOUR NOTEBOOK TRUCK LOCATIONS
EAST_DEPOT = {"lat": 26.397820, "lng": 50.204268}
WEST_DEPOT = {"lat": 26.383639, "lng": 50.186365}

LANDFILL = {"lat": 26.160087740331367, "lng": 49.86990882883503}

campus_depot_map = {
    "east": EAST_DEPOT,
    "west": WEST_DEPOT,
}

OSRM_CACHE = {}


def haversine_km(a_lat, a_lng, b_lat, b_lng):
    r = 6371.0
    d_lat = radians(b_lat - a_lat)
    d_lng = radians(b_lng - a_lng)
    x = sin(d_lat / 2) ** 2 + cos(radians(a_lat)) * cos(radians(b_lat)) * sin(d_lng / 2) ** 2
    return 2 * r * asin(sqrt(x))


def travel_minutes_from_km(distance_km, speed_kmph):
    if distance_km <= 0 or speed_kmph <= 0:
        return 0
    return max(1, round((distance_km / speed_kmph) * 60))


def demand_kg(fill_pct):
    return round((fill_pct / 100.0) * BIN_CAPACITY_KG)


def risk_label(fill_pct):
    if fill_pct >= 80:
        return "High"
    if fill_pct >= 60:
        return "Medium"
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
    if not candidates:
        return {}

    lats = [b["lat"] for b in candidates]
    lngs = [b["lng"] for b in candidates]
    min_lat, max_lat = min(lats), max(lats)
    min_lng, max_lng = min(lngs), max(lngs)
    lat_range = max(max_lat - min_lat, 1e-9)
    lng_range = max(max_lng - min_lng, 1e-9)

    out = {}
    for b in candidates:
        left_pct = 12 + ((b["lng"] - min_lng) / lng_range) * 70
        top_pct = 12 + (1 - (b["lat"] - min_lat) / lat_range) * 70
        out[b["id"]] = {"leftPct": round(left_pct, 1), "topPct": round(top_pct, 1)}
    return out


def get_osrm_route(lat1, lon1, lat2, lon2):
    key = (round(lat1, 6), round(lon1, 6), round(lat2, 6), round(lon2, 6))
    if key in OSRM_CACHE:
        return OSRM_CACHE[key]

    url = (
        f"https://router.project-osrm.org/route/v1/driving/"
        f"{lon1},{lat1};{lon2},{lat2}"
        f"?overview=full&geometries=geojson"
    )

    try:
        response = requests.get(url, timeout=3)
        data = response.json()

        if data.get("code") != "Ok":
            coords = [[lon1, lat1], [lon2, lat2]]
            OSRM_CACHE[key] = coords
            return coords

        coords = data["routes"][0]["geometry"]["coordinates"]
        OSRM_CACHE[key] = coords
        return coords

    except Exception:
        coords = [[lon1, lat1], [lon2, lat2]]
        OSRM_CACHE[key] = coords
        return coords


def parse_forecast_hours(label):
    if not label:
        return 12
    label = str(label).lower()
    if "6" in label:
        return 6
    if "24" in label:
        return 24
    return 12


def add_ai_features(rows, forecast_hours=12):
    enriched = []

    for r in rows:
        item = dict(r)
        item["campus"] = item["side"].lower()

        predicted_fill = min(
            item["current_fill"] + item["fill_rate_pctph"] * forecast_hours,
            100.0
        )
        item["pred_fill"] = round(predicted_fill, 1)

        item["overdue"] = item["hours_since_last_collect"] >= OVERDUE_HOURS
        item["demand_kg"] = demand_kg(item["current_fill"])

        if item["overdue"] or item["current_fill"] >= 70:
            item["priority_class"] = "MUST"
        elif item["pred_fill"] >= 70:
            item["priority_class"] = "SHOULD"
        else:
            item["priority_class"] = "OPTIONAL"

        enriched.append(item)

    return enriched


def build_candidates(payload, scoped):
    threshold = int(payload["threshold"])
    mode = payload["mode"].upper()
    auto_select = payload["autoSelect"]
    manual_bin_id = payload.get("manualBinId")

    if not auto_select:
        manual = [b for b in scoped if b["id"] == manual_bin_id]
        return {"must_bins": manual, "optional_bins": []}

    if mode == "STATIC":
        must_bins = [b for b in scoped if b["current_fill"] >= threshold]
        return {"must_bins": must_bins, "optional_bins": []}

    dynamic_bins = [
        b for b in scoped
        if (
            b["current_fill"] >= threshold
            or b["pred_fill"] >= threshold
            or b["overdue"]
        )
    ]

    return {"must_bins": dynamic_bins, "optional_bins": []}


def add_priority_score(rows, goal):
    out = []

    for b in rows:
        x = dict(b)

        if goal == "time":
            x["priority_score"] = 0.9 * x["current_fill"] + 0.6 * x["pred_fill"]
        elif goal == "overflow":
            x["priority_score"] = 1.3 * x["pred_fill"] + 0.6 * x["current_fill"]
        else:
            x["priority_score"] = 1.0 * x["current_fill"] + 0.5 * x["pred_fill"]

        out.append(x)

    return out


def build_distance_matrix(nodes):
    return [
        [int(round(haversine_km(a["lat"], a["lng"], b["lat"], b["lng"]) * 1000)) for b in nodes]
        for a in nodes
    ]


def build_time_matrix(nodes):
    matrix = []
    for i, a in enumerate(nodes):
        row = []
        for j, b in enumerate(nodes):
            if i == j:
                row.append(0)
                continue
            km = haversine_km(a["lat"], a["lng"], b["lat"], b["lng"])
            t = travel_minutes_from_km(km, CAMPUS_SPEED_KMPH)
            if i != 0:
                t += SERVICE_TIME_BIN_MIN
            row.append(int(round(t)))
        matrix.append(row)
    return matrix


def solve_single_trip(payload, candidates, depot_lat, depot_lng):
    if not candidates:
        return {"visited_bins": []}

    nodes = [{
        "id": "DEPOT",
        "lat": depot_lat,
        "lng": depot_lng,
        "demand_kg": 0,
        "priority_score": 0,
    }] + candidates

    distance_matrix = build_distance_matrix(nodes)
    time_matrix = build_time_matrix(nodes)
    demands = [0] + [b["demand_kg"] for b in candidates]

    manager = pywrapcp.RoutingIndexManager(len(nodes), 1, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        f = manager.IndexToNode(from_index)
        t = manager.IndexToNode(to_index)
        return distance_matrix[f][t]

    def time_callback(from_index, to_index):
        f = manager.IndexToNode(from_index)
        t = manager.IndexToNode(to_index)
        return time_matrix[f][t]

    def demand_callback(from_index):
        f = manager.IndexToNode(from_index)
        return demands[f]

    distance_cb_idx = routing.RegisterTransitCallback(distance_callback)
    time_cb_idx = routing.RegisterTransitCallback(time_callback)
    demand_cb_idx = routing.RegisterUnaryTransitCallback(demand_callback)

    goal = payload.get("goal", "distance")
    routing.SetArcCostEvaluatorOfAllVehicles(time_cb_idx if goal == "time" else distance_cb_idx)

    routing.AddDimension(time_cb_idx, 0, MAX_ROUTE_DURATION_MIN, True, "Time")
    routing.AddDimensionWithVehicleCapacity(
        demand_cb_idx,
        0,
        [int(payload.get("truckCapacityKg", TRUCK_CAPACITY_KG_DEFAULT))],
        True,
        "Capacity",
    )
    routing.AddConstantDimension(1, MAX_STOPS_PER_TRIP + 1, True, "Stops")

    for i, b in enumerate(candidates, start=1):
        index = manager.NodeToIndex(i)
        penalty = int(300000 + (b["priority_score"] * 1000))
        routing.AddDisjunction([index], penalty)

    search = pywrapcp.DefaultRoutingSearchParameters()
    search.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search.time_limit.seconds = 2

    solution = routing.SolveWithParameters(search)
    if solution is None:
        return {"visited_bins": []}

    visited = []
    index = routing.Start(0)

    while not routing.IsEnd(index):
        next_index = solution.Value(routing.NextVar(index))
        to_node = manager.IndexToNode(next_index)

        if to_node != 0:
            visited.append(candidates[to_node - 1])

        index = next_index

    return {"visited_bins": visited}


def build_route_timeline(visited):
    if not visited:
        return [], [], 0.0, 0

    first_side = visited[0]["side"].lower()
    depot = campus_depot_map[first_side]

    rows = []
    serviced_rows = []

    current_time_min = 0
    total_km = 0.0
    onboard_kg = 0
    trip_stops = 0

    cur_node = {
        "node_id": "DEPOT",
        "node_type": "DEPOT",
        "lat": depot["lat"],
        "lng": depot["lng"],
        "side": visited[0]["side"],
    }

    def speed_for_leg(from_type, to_type):
        if from_type == "LANDFILL" or to_type == "LANDFILL":
            return OUTSIDE_SPEED_KMPH
        return CAMPUS_SPEED_KMPH

    def add_leg(from_node, to_node, service_min=0):
        nonlocal current_time_min, total_km

        km = haversine_km(from_node["lat"], from_node["lng"], to_node["lat"], to_node["lng"])
        speed = speed_for_leg(from_node["node_type"], to_node["node_type"])
        travel_min = travel_minutes_from_km(km, speed)

        depart_min = current_time_min
        arrive_min = depart_min + travel_min
        done_min = arrive_min + service_min

        rows.append({
            "from_node": from_node["node_id"],
            "to_node": to_node["node_id"],
            "from_type": from_node["node_type"],
            "to_type": to_node["node_type"],
            "from_lat": from_node["lat"],
            "from_lng": from_node["lng"],
            "to_lat": to_node["lat"],
            "to_lng": to_node["lng"],
            "depart_min": round(depart_min),
            "arrive_min": round(arrive_min),
            "done_min": round(done_min),
            "distance_km": round(km, 3),
            "campus": to_node.get("side", from_node.get("side", "East")),
        })

        current_time_min = done_min
        total_km += km

    for b in visited:
        next_node = {
            "node_id": b["id"],
            "node_type": "BIN",
            "lat": b["lat"],
            "lng": b["lng"],
            "side": b["side"],
        }

        next_demand = b["demand_kg"]

        if (onboard_kg + next_demand > TRUCK_CAPACITY_KG_DEFAULT) or (trip_stops >= MAX_STOPS_PER_TRIP):
            landfill_node = {
                "node_id": "LANDFILL",
                "node_type": "LANDFILL",
                "lat": LANDFILL["lat"],
                "lng": LANDFILL["lng"],
                "side": cur_node["side"],
            }
            add_leg(cur_node, landfill_node, service_min=LANDFILL_SERVICE_MIN)
            cur_node = landfill_node
            onboard_kg = 0
            trip_stops = 0

        add_leg(cur_node, next_node, service_min=SERVICE_TIME_BIN_MIN)

        serviced_rows.append({
            "bin": b,
            "arrive_min": rows[-1]["arrive_min"],
        })

        cur_node = next_node
        onboard_kg += next_demand
        trip_stops += 1

    landfill_node = {
        "node_id": "LANDFILL",
        "node_type": "LANDFILL",
        "lat": LANDFILL["lat"],
        "lng": LANDFILL["lng"],
        "side": cur_node["side"],
    }
    add_leg(cur_node, landfill_node, service_min=LANDFILL_SERVICE_MIN)

    return rows, serviced_rows, round(total_km, 2), round(current_time_min)


def build_route_geometry(timeline_rows):
    features = []

    for row in timeline_rows:
        coords = get_osrm_route(
            row["from_lat"], row["from_lng"],
            row["to_lat"], row["to_lng"],
        )

        features.append({
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": coords,
            },
            "properties": {
                "fromNode": row["from_node"],
                "toNode": row["to_node"],
                "campus": row["campus"],
            },
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


def solve_route(payload: dict):
    zone = payload["zone"]
    mode = payload["mode"].upper()
    goal = payload["goal"]
    shift_start = payload["shiftStart"]
    truck_capacity_kg = int(payload.get("truckCapacityKg", TRUCK_CAPACITY_KG_DEFAULT))
    threshold = int(payload["threshold"])

    scoped = [dict(b) for b in BINS if zone == "All" or b["side"] == zone]

    forecast_hours = parse_forecast_hours(payload.get("forecastHorizon"))
    snapshot = add_ai_features(scoped, forecast_hours)

    candidate_sets = build_candidates(payload, snapshot)
    must_bins = add_priority_score(candidate_sets["must_bins"], goal)
    optional_bins = add_priority_score(candidate_sets["optional_bins"], goal)

    if not must_bins and not optional_bins:
        return {
            "kpis": {
                "totalActiveBins": len(snapshot),
                "binsAbove80": len([b for b in snapshot if b["current_fill"] >= 80]),
                "selectedBins": 0,
                "averageFillLevel": round(sum(b["current_fill"] for b in snapshot) / len(snapshot), 2) if snapshot else 0,
                "overThreshold": len([b for b in snapshot if b["current_fill"] >= threshold]),
            },
            "summary": {
                "totalBins": 0,
                "totalDistanceKm": 0,
                "estimatedTimeMin": 0,
                "overflowPrevented": 0,
            },
            "routeStops": [],
            "routeGeometry": {"type": "FeatureCollection", "features": []},
            "driverRoute": {
                "routeId": f"{mode}-ROUTE-001",
                "totalStops": 0,
                "estDuration": "0h 0m",
                "binsToCollect": 0,
                "truckCapacityPct": 0,
                "stops": [],
            },
        }

    first_side = (must_bins + optional_bins)[0]["side"].lower()
    depot = campus_depot_map[first_side]

    ordered_plan = solve_single_trip(
        payload,
        must_bins + optional_bins,
        depot["lat"],
        depot["lng"],
    )
    visited = ordered_plan["visited_bins"]

    timeline_rows, serviced_rows, total_distance_km, total_time_min = build_route_timeline(visited)
    route_geometry = build_route_geometry(timeline_rows)

    pos_map = normalize_positions(snapshot)

    route_stops = []
    driver_stops = []

    for idx, item in enumerate(serviced_rows, start=1):
        b = item["bin"]
        pos = pos_map.get(b["id"], {"leftPct": 20 + idx * 8, "topPct": 20 + idx * 7})

        fill_in = "Scheduled" if mode == "STATIC" else ("Now" if b["current_fill"] >= threshold or b["overdue"] else f"Within {forecast_hours}h")

        route_stops.append({
            "id": str(idx),
            "binId": b["id"],
            "fillPct": round(b["current_fill"], 1),
            "forecastPct": round(b["pred_fill"], 1),
            "eta": eta_from_minutes(shift_start, int(item["arrive_min"])),
            "fillInHours": fill_in,
            "risk": risk_label(b["current_fill"]),
            "priority": idx,
            "topPct": pos["topPct"],
            "leftPct": pos["leftPct"],
        })

        driver_stops.append({
            "id": f"stop-{idx}",
            "binId": b["id"],
            "placeName": b["placeName"],
            "fillPct": round(b["current_fill"], 1),
            "distanceKm": 0,
            "etaMin": int(item["arrive_min"]),
            "address": f"{b['placeName']}, {b['side']} Campus, IAU",
            "lat": b["lat"],
            "lng": b["lng"],
            "status": "current" if idx == 1 else "pending",
        })

    avg_fill = round(sum(b["current_fill"] for b in snapshot) / len(snapshot), 2) if snapshot else 0

    return {
        "kpis": {
            "totalActiveBins": len(snapshot),
            "binsAbove80": len([b for b in snapshot if b["current_fill"] >= 80]),
            "selectedBins": len(route_stops),
            "averageFillLevel": avg_fill,
            "overThreshold": len([b for b in snapshot if b["current_fill"] >= threshold]),
        },
        "summary": {
            "totalBins": len(route_stops),
            "totalDistanceKm": total_distance_km,
            "estimatedTimeMin": total_time_min,
            "overflowPrevented": len(route_stops),
        },
        "routeStops": route_stops,
        "routeGeometry": route_geometry,
        "driverRoute": {
            "routeId": f"{mode}-ROUTE-001",
            "totalStops": len(driver_stops),
            "estDuration": f"{total_time_min // 60}h {total_time_min % 60}m",
            "binsToCollect": len(driver_stops),
            "truckCapacityPct": 0 if truck_capacity_kg == 0 else round((sum(b["demand_kg"] for b in visited) / truck_capacity_kg) * 100),
            "stops": driver_stops,
        },
    }