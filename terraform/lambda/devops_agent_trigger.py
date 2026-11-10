import base64, hashlib, hmac, json, os
from datetime import datetime, timezone
import boto3, urllib3

http = urllib3.PoolManager()
_sm = boto3.client("secretsmanager")
_cfg = None


def _config():
    global _cfg
    if _cfg is None:
        _cfg = json.loads(_sm.get_secret_value(SecretId=os.environ["SECRET_ID"])["SecretString"])
    return _cfg


def _build(event):
    d = event.get("detail", {})
    kind = event.get("detail-type", "")
    now = datetime.now(timezone.utc).isoformat()

    if kind == "ECS Deployment State Change":
        service_arn = (event.get("resources") or ["unknown"])[0]
        service = service_arn.split("/")[-1]
        dep = d.get("deploymentId", "unknown")
        return {
            "eventType": "incident",
            "incidentId": f"deploy-{dep}",
            "action": "created",
            "priority": "HIGH",
            "title": f"ECS deployment failed: {service}",
            "description": (
                f"ECS service {service} deployment {dep} failed "
                f"({d.get('eventName')}). Reason: {d.get('reason', 'n/a')}. "
                "The deployment circuit breaker may have rolled back. "
                "Investigate the cause, including recent commits and container logs."
            ),
            "timestamp": now,
            "service": service,
            "data": {"metadata": {"serviceArn": service_arn, "deploymentId": dep,
                                  "eventName": d.get("eventName"), "reason": d.get("reason")}},
        }

    # ECS Task State Change: only real crashes
    containers = d.get("containers", [])
    codes = [c.get("exitCode") for c in containers if c.get("exitCode") is not None]
    if not any(code != 0 for code in codes):
        return None
    task_arn = d.get("taskArn", "unknown")
    cluster = d.get("clusterArn", "unknown").split("/")[-1]
    group = d.get("group", "")
    td = d.get("taskDefinitionArn", "unknown").split("/")[-1]
    return {
        "eventType": "incident",
        "incidentId": f"crash-{cluster}-{td}",
        "action": "created",
        "priority": "HIGH",
        "title": f"ECS container crashing: {group or cluster}",
        "description": (
            f"Task {task_arn.split('/')[-1]} in cluster {cluster} stopped.\n"
            f"Task definition: {td}\nStop code: {d.get('stopCode')}\n"
            f"Reason: {d.get('stoppedReason')}\nExit codes: {codes}"
        ),
        "timestamp": now,
        "service": cluster,
        "data": {"metadata": {"taskArn": task_arn, "clusterArn": d.get("clusterArn"),
                              "stoppedReason": d.get("stoppedReason"),
                              "stopCode": d.get("stopCode"), "containers": containers}},
    }


def lambda_handler(event, context):
    print(json.dumps(event))
    payload = _build(event)
    if payload is None:
        print("Task stopped cleanly, skipping")
        return {"skipped": True}

    cfg = _config()
    body = json.dumps(payload)
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    sig = base64.b64encode(
        hmac.new(cfg["secret"].encode(), f"{ts}:{body}".encode(), hashlib.sha256).digest()
    ).decode()

    resp = http.request("POST", cfg["url"], body=body, headers={
        "Content-Type": "application/json",
        "x-amzn-event-timestamp": ts,
        "x-amzn-event-signature": sig,
    })
    print("Webhook status", resp.status, resp.data.decode())
    if resp.status not in (200, 202):
        raise Exception(f"Webhook failed: {resp.status}")
    return {"status": resp.status}