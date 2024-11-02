import boto3
import os
import time

dynamodb_client = boto3.client('dynamodb')

table_t = os.environ['TABLE_T']

def handler(event, context):
    print("Cleaner Lambda invoked")

    current_time = int(time.time())

    response = dynamodb_client.scan(
        TableName=table_t,
        FilterExpression='isDeleted = :val',
        ExpressionAttributeValues={
            ':val': {'S': 'true'}
        }
    )
    
    items = response.get('Items', [])

    for item in items:
        copy_timestamp = int(item['copyTimestamp']['N'])
        
        if copy_timestamp < (current_time - 10):
            object_name = item['objectName']['S']
            print(f"Deleting copy of {object_name} with timestamp {copy_timestamp}")

            dynamodb_client.delete_item(
                TableName=table_t,
                Key={
                    'objectName': {'S': object_name},
                    'copyTimestamp': {'N': str(copy_timestamp)}
                }
            )

    return {
        'statusCode': 200,
        'body': 'Cleaner Lambda function executed successfully'
    }