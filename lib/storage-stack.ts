import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class StorageStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // create Bucket Src
    const bucketSrc = new s3.Bucket(this, 'BucketSrc', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });

    // create Bucket Dst
    const bucketDst = new s3.Bucket(this, 'BucketDst', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, 
    });

    // create table T
    const tableT = new dynamodb.Table(this, 'TableT', {
        partitionKey: { name: 'objectName', type: dynamodb.AttributeType.STRING }, 
        sortKey: { name: 'copyTimestamp', type: dynamodb.AttributeType.NUMBER },  
    });

    // Output the names of the created resources
    new cdk.CfnOutput(this, 'BucketSrcNameOutput', {
        value: bucketSrc.bucketName,
        exportName: 'BucketSrcName'
    });
    new cdk.CfnOutput(this, 'BucketDstNameOutput', {
        value: bucketDst.bucketName,
        exportName: 'BucketDstName'
    });
    new cdk.CfnOutput(this, 'TableTNameOutput', {
        value: tableT.tableName,
        exportName: 'TableTName'
    });
  }
}