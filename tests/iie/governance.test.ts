import test from 'node:test';
import assert from 'node:assert/strict';
import {phaseOneCapability} from '../../shared/iie/governance.ts';
test('IIE-017 / IIE-018: no CHAMBER or Beacon authority inferred',()=>{assert.equal(phaseOneCapability('CHAMBER_FACTORY_PASS').allowed,false);assert.equal(phaseOneCapability('BEACON_APPROVED').allowed,false);});
test('IIE-019: external applications rejected',()=>{for(const a of ['SUBMIT_APPLICATION','EMAIL_RECRUITER','ACCEPT_ASSIGNMENT','SIGN_CONTRACT','PAY','DEPLOY','WRITE_FILE','CONNECTOR_SYNC'])assert.equal(phaseOneCapability(a).allowed,false,a);});
test('only source-only actions allowed',()=>{for(const a of ['ANALYZE','CLASSIFY','SCORE','RECONCILE_SYNTHETIC','PREPARE_BRIEF'])assert.equal(phaseOneCapability(a).allowed,true,a);});
