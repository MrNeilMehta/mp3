#!/usr/bin/env python3

import sys
import getopt
import json
import http.client
import ssl
from random import randint, choice
from time import mktime
from datetime import date


def usage():
    print('Usage: dbFill.py -u <baseurl> -p <port> -n <numUsers> -t <numTasks>')


def make_conn(host, port):
    ctx = ssl._create_unverified_context()
    return http.client.HTTPSConnection(host, port, timeout=10, context=ctx)


def main(argv):
    baseurl = "localhost"
    port = 3000
    userCount = 20
    taskCount = 100

    try:
        opts, args = getopt.getopt(argv, "hu:p:n:t:", ["url=", "port=", "users=", "tasks="])
    except getopt.GetoptError:
        usage()
        sys.exit(2)

    for opt, arg in opts:
        if opt in ("-u", "--url"):
            baseurl = arg
        elif opt in ("-p", "--port"):
            port = int(arg)
        elif opt in ("-n", "--users"):
            userCount = int(arg)
        elif opt in ("-t", "--tasks"):
            taskCount = int(arg)

    print(f"🚀 Adding {userCount} users and {taskCount} tasks to {baseurl}:{port}")

    conn = make_conn(baseurl, port)
    headers = {"Content-Type": "application/json"}

    # Sample names
    first = ["james", "john", "michael", "william", "david"]
    last = ["smith", "johnson", "williams", "brown", "jones"]

    userIDs = []

    # CREATE USERS
    for i in range(userCount):
        fname = choice(first)
        lname = choice(last)
        name = f"{fname} {lname}"
        email = f"{fname}{lname}{randint(1000,9999)}@example.com"

        body = json.dumps({"name": name, "email": email})

        conn.request("POST", "/api/users", body, headers)
        res = conn.getresponse()
        data = res.read().decode()

        try:
            d = json.loads(data)
            if "data" in d:
                userIDs.append(d["data"]["_id"])
        except:
            pass

    # LOAD TASK NAMES
    try:
        with open("tasks.txt") as f:
            taskNames = f.read().splitlines()
    except:
        print("❌ Missing tasks.txt")
        sys.exit(1)

    # CREATE TASKS
    for i in range(taskCount):
        assigned = randint(0, 10) > 5 and len(userIDs) > 0
        uid = choice(userIDs) if assigned else ""
        uname = "unassigned"

        body = json.dumps({
            "name": choice(taskNames),
            "deadline": (mktime(date.today().timetuple()) + randint(1,10)*86400)*1000,
            "description": "Auto-generated task",
            "completed": bool(randint(0,1)),
            "assignedUser": uid,
            "assignedUserName": uname
        })

        conn.request("POST", "/api/tasks", body, headers)
        conn.getresponse().read()

    print("✅ Done!")


if __name__ == "__main__":
    main(sys.argv[1:])
