#!/usr/bin/env python3

import math

#from cloudquant.interfaces import Strategy

class ChartHelper():

    ########################################################################################
    #
    # Chart Basic Functions
    #
    ########################################################################################

    # Returns the absolute value of the difference between the open and close
    @staticmethod
    def get_bar_body(br):
        #print("Bar",str(br))
        #return True
        return math.fabs(br.get('open') - br.get('close'))

    # Returns the absolute value of the difference between the high and low
    @staticmethod
    def get_bar_range(br):
        return math.fabs(br.get('high') - br.get('low'))

    # Returns the absolute value of the difference between the high and low
    def get_base_body_mid(self, base):
        return (self.max_base_body(base)+self.min_base_body(base))/2

    # Returns the maximum open or close value found in base
    @staticmethod
    def max_base_body(base):
        baseIndex = max(base, key=lambda x: max(base.get(x).get('open'),base.get(x).get('close')))
        return max(base.get(baseIndex).get('open'),base.get(baseIndex).get('close'))

    # Returns the maximum open or close value found in base
    @staticmethod
    def min_base_body(base):
        baseIndex = min(base, key=lambda x: min(base.get(x).get('open'),base.get(x).get('close')))
        return min(base.get(baseIndex).get('open'),base.get(baseIndex).get('close'))