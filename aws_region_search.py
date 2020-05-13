#!/usr/bin/env python3

from ipaddress import ip_network, ip_address
import json

import requests

res = requests.get('https://ip-ranges.amazonaws.com/ip-ranges.json')

def find_aws_region(ip):

  ip_json = res.json()
  #ip_json = json.load(open('ip-ranges.json'))
  prefixes = ip_json['prefixes']
  my_ip = ip_address(ip)
  region = 'Unknown'
  for prefix in prefixes:
    if my_ip in ip_network(prefix['ip_prefix']):
      region = prefix['region']
      break
  return region

print(find_aws_region('193.72.79.190'))
print(find_aws_region('149.202.211.45'))
