#!/usr/bin/env python

"""
 * @file dbFill.py
 * Used in CS498RK MP4 to populate database with randomly generated users and tasks.
 *
 * @author Aswin Sivaraman
 * @date Created: Spring 2015
 * @date Modified: Spring 2015
 * @date Modified: Spring 2019
"""

import sys
import getopt
import http.client
import urllib
import json
from random import randint, choice
from datetime import date
from time import mktime


def usage():
    print('Usage: dbFill.py -u <baseurl> -p <port> -n <numUsers> -t <numTasks>')


def main(argv):
    # Default values
    baseurl = "localhost"
    port = 3000
    userCount = 20
    taskCount = 100

    # Parse CLI args
    try:
        opts, args = getopt.getopt(argv, "hu:p:n:t:", ["url=", "port=", "users=", "tasks="])
    except getopt.GetoptError:
        usage()
        sys.exit(2)

    for opt, arg in opts:
        if opt == '-h':
            usage()
            sys.exit()
        elif opt in ("-u", "--url"):
            baseurl = str(arg)
        elif opt in ("-p", "--port"):
            port = int(arg)
        elif opt in ("-n", "--users"):
            userCount = int(arg)
        elif opt in ("-t", "--tasks"):
            taskCount = int(arg)

    # Sample names
    firstNames = ["james", "john", "robert", "michael", "william", "david", "richard", "charles", "joseph", "thomas"]
    lastNames = ["smith", "johnson", "williams", "jones", "brown", "davis", "miller", "wilson", "moore", "taylor"]

    # Connect to API
    conn = http.client.HTTPConnection(baseurl, port)
    headers = {"Content-type": "application/x-www-form-urlencoded", "Accept": "application/json"}

    userIDs, userNames, userEmails = [], [], []

    print(f"🚀 Adding {userCount} users and {taskCount} tasks to {baseurl}:{port}")

    # ---------- Create Users ----------
    for i in range(userCount):
        x, y = randint(0, len(firstNames) - 1), randint(0, len(lastNames) - 1)
        user_name = f"{firstNames[x]} {lastNames[y]}"
        email = f"{firstNames[x]}{lastNames[y]}{randint(0, 9999)}@example.com"
        params = urllib.parse.urlencode({'name': user_name, 'email': email})

        conn.request("POST", "/api/users", params, headers)
        response = conn.getresponse()
        data = response.read().decode()
        d = json.loads(data)

        if d.get("data") and d.get("message") == "Created":
            userIDs.append(str(d['data']['_id']))
            userNames.append(str(d['data']['name']))
            userEmails.append(str(d['data']['email']))
        else:
            print(f"❌ Failed to create user '{user_name}': {d.get('message')}")
            continue

    # ---------- Create Tasks ----------
    try:
        with open('tasks.txt', 'r') as f:
            taskNames = f.read().splitlines()
    except FileNotFoundError:
        print("❌ tasks.txt not found. Please place it in the same folder as dbFill.py.")
        sys.exit(1)

    for i in range(taskCount):
        assigned = (randint(0, 10) > 4)
        assignedUser = randint(0, len(userIDs) - 1) if assigned and userIDs else -1
        assignedUserID = userIDs[assignedUser] if assigned and userIDs else ''
        assignedUserName = userNames[assignedUser] if assigned and userNames else 'unassigned'
        completed = (randint(0, 10) > 5)
        deadline = (mktime(date.today().timetuple()) + randint(86400, 864000)) * 1000
        description = "Auto-generated sample task for testing."

        params = urllib.parse.urlencode({
            'name': choice(taskNames),
            'deadline': deadline,
            'assignedUserName': assignedUserName,
            'assignedUser': assignedUserID,
            'completed': str(completed).lower(),
            'description': description
        })

        conn.request("POST", "/api/tasks", params, headers)
        response = conn.getresponse()
        data = response.read().decode()
        d = json.loads(data)

        if not d.get("data"):
            print(f"❌ Failed to create task: {d.get('message')}")
            continue

    conn.close()
    print(f"✅ Successfully added {len(userIDs)} users and {taskCount} tasks to {baseurl}:{port}")


if __name__ == "__main__":
    main(sys.argv[1:])