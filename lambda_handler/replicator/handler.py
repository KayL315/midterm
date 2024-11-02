import boto3
import os
import time

s3_client = boto3.client('s3')
dynamodb_client = boto3.client('dynamodb')

bucket_dst = os.environ['BUCKET_DST']
table_t = os.environ['TABLE_T']

def handler(event, context):
    print("Received event:", event)

    for record in event['Records']:
        event_name = record['eventName']
        bucket_name = record['s3']['bucket']['name']
        object_key = record['s3']['object']['key']

        if 'ObjectCreated' in event_name:
            print(f"Processing PUT event for {object_key} in {bucket_name}")
            copy_source = {'Bucket': bucket_name, 'Key': object_key}
            timestamp = int(time.time())

            # copy
            s3_client.copy_object(Bucket=bucket_dst, CopySource=copy_source, Key=object_key)
            print(f"Copied {object_key} to {bucket_dst}")

            response = dynamodb_client.query(
                TableName=table_t,
                KeyConditionExpression='objectName = :objName',
                ExpressionAttributeValues={
                    ':objName': {'S': object_key}
                }
            )
            items = response.get('Items', [])

            if items:
                # delete the old one
                items.sort(key=lambda x: int(x['copyTimestamp']['N']))  
                oldest_item = items[0]
                old_timestamp = oldest_item['copyTimestamp']['N']
                print(f"Deleting oldest copy with timestamp {old_timestamp} for {object_key}")
                dynamodb_client.delete_item(
                    TableName=table_t,
                    Key={
                        'objectName': {'S': object_key},
                        'copyTimestamp': {'N': old_timestamp}
                    }
                )

            dynamodb_client.put_item(
                TableName=table_t,
                Item={
                    'objectName': {'S': object_key},  
                    'copyTimestamp': {'N': str(timestamp)},  
                    'isDeleted': {'S': 'false'}  
                }
            )
            print(f"Updated DynamoDB with new copy for {object_key}")

        elif 'ObjectRemoved' in event_name:
            print(f"Processing DELETE event for {object_key} in {bucket_name}")
            response = dynamodb_client.query(
                TableName=table_t,
                KeyConditionExpression='objectName = :objName',
                ExpressionAttributeValues={':objName': {'S': object_key}}
            )
            items = response.get('Items', [])

            for item in items:
                copy_timestamp = item['copyTimestamp']['N']
                print(f"Marking copy with timestamp {copy_timestamp} as deleted for {object_key}")
                dynamodb_client.update_item(
                    TableName=table_t,
                    Key={
                        'objectName': {'S': object_key},
                        'copyTimestamp': {'N': copy_timestamp}
                    },
                    UpdateExpression="SET isDeleted = :val",
                    ExpressionAttributeValues={
                        ':val': {'S': 'true'}
                    }
                )

    return {
        'statusCode': 200,
        'body': 'Replicator Lambda function executed successfully'
    }