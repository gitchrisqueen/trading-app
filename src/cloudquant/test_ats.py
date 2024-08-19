#!/usr/bin/env python3

import unittest
#from unittest.mock import patch
#@patch('cloudquant.interfaces.Strategy')

import time
from ats import ChartHelper



class TestChartHelperMethods(unittest.TestCase):
    def setUp(self):
        self.ch = ChartHelper()
        self.ts = time.time()
        self.bar1 = {'high':4,'open':3,'close':2,'low':1,'time':self.ts}
        self.bar2 = {'high':8,'open':7,'close':6,'low':5,'time':self.getNextTime()}
        self.bar3 = {'high':12,'open':11,'close':10,'low':9,'time':self.getNextTime()}
        self.barBoring = {'high':10,'open':6,'close':5,'low':1,'time':self.getNextTime()}
        self.barExciting = {'high':10,'open':9,'close':2,'low':1,'time':self.getNextTime()}
        self.currentPrice = 20
        demandBar = self.getDemandBar(self.barBoring,self.currentPrice)
        self.demand = {1: demandBar, 2: demandBar, 3: demandBar}
        supplyBar = self.getSupplyBar(self.barBoring,self.currentPrice)
        self.supply = {1: supplyBar, 2: supplyBar, 3: supplyBar}
        self.zone = {
                        1:self.bar2,
                        2:self.bar1,
                        3:self.bar3,
                    }
        self.bars = {
                1:self.getNewExcitingBar(),
                2:self.getNewExcitingBar(),
                3:self.getNewBoringBar(), # Zone 1
                4:self.getNewBoringBar(), # Zone 1
                5:self.getNewBoringBar(), # Zone 1
                6:self.getNewExcitingBar(),
                7:self.getNewBoringBar(), # Zone 2 (length 1)
                8:self.getNewExcitingBar(),
                9:self.getNewBoringBar(), # Zone 3
                10:self.getNewBoringBar(), # Zone 3
                11:self.getNewBoringBar(), # Zone 3
                12:self.getNewBoringBar(), # Zone 3
                13:self.getNewExcitingBar(),
                14:self.getNewBoringBar(), # Zone 4
                15:self.getNewBoringBar() # Zone 4
            }

    def getDemandBar(self,boringBar,currentPrice):
        demandBar = {}
        for key, value in boringBar.items():
            if(key!='time'):
                demandBar[key] = currentPrice - (value *2)
            else:
                demandBar[key] = self.getNextTime()
        return demandBar

    def getSupplyBar(self,boringBar,currentPrice):
            demandBar = {}
            for key, value in boringBar.items():
                if(key!='time'):
                    demandBar[key] = currentPrice + (value *2)
                else:
                    demandBar[key] = self.getNextTime()
            return demandBar

    def getNewBoringBar(self):
        b = self.barBoring
        b['time'] = self.getNextTime()
        return b

    def getNewExcitingBar(self):
        b = self.barExciting
        b['time'] = self.getNextTime()
        return b

    def getNextTime(self):
        self.ts += 1
        return self.ts


    def test_get_bar_body(self):
        for key, value in self.zone.items():
            print("get_bar_body("+str(value)+") expects to equal 1")
            barBody = self.ch.get_bar_body(value)
            self.assertEqual(barBody, 1)

    def test_max_base_body(self):
       print("max_base_body("+str(self.zone)+") expects to equal 11")
       r = self.ch.max_base_body(self.zone)
       self.assertEqual(r, 11)
   
    def test_is_boring(self):
        print("is")


if __name__ == '__main__':
    unittest.main()