import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class CleanerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableT = dynamodb.Table.fromTableName(this, 'ImportedTableT', cdk.Fn.importValue('TableTName'));

    const cleanerLambda = new lambda.Function(this, 'CleanerLambda', {
      runtime: lambda.Runtime.PYTHON_3_9, 
      handler: 'handler.handler',
      code: lambda.Code.fromAsset('lambda_handler/cleaner'), 
      environment: {
        TABLE_T: tableT.tableName,
      },
    });

    tableT.grantReadWriteData(cleanerLambda);

    const rule = new events.Rule(this, 'CleanerSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)), 
    });
    rule.addTarget(new targets.LambdaFunction(cleanerLambda));
  }
}