#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { Project10CdkVersionStack } from '../lib/project-10-cdk-version-stack';

const app = new cdk.App();
new Project10CdkVersionStack(app, 'Project10CdkVersionStack', {
  env: { account: '753656081091', region: 'eu-west-2' },

});
