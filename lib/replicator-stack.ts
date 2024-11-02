import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

export class ReplicatorStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucketSrc = s3.Bucket.fromBucketName(this, 'ImportedBucketSrc', cdk.Fn.importValue('BucketSrcName'));
    const bucketDst = s3.Bucket.fromBucketName(this, 'ImportedBucketDst', cdk.Fn.importValue('BucketDstName'));
    const tableT = dynamodb.Table.fromTableName(this, 'ImportedTableT', cdk.Fn.importValue('TableTName'));

    const replicatorLambda = new lambda.Function(this, 'ReplicatorLambda', {
        runtime: lambda.Runtime.PYTHON_3_9, 
        handler: 'handler.handler', 
        code: lambda.Code.fromAsset('lambda_handler/replicator'), 
        environment: {
          BUCKET_DST: bucketDst.bucketName,
          TABLE_T: tableT.tableName,
        },
      });


    bucketSrc.grantRead(replicatorLambda);
    bucketDst.grantWrite(replicatorLambda);
    tableT.grantReadWriteData(replicatorLambda);

    bucketSrc.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(replicatorLambda)
    );

    bucketSrc.addEventNotification(
      s3.EventType.OBJECT_REMOVED_DELETE,
      new s3n.LambdaDestination(replicatorLambda)
    );
  }
}