import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE = process.env.CONNECTIONS_TABLE ?? 'Connections';

export async function addConnection(connectionId: string): Promise<void> {
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        connectionId,
        connectedAt: new Date().toISOString(),
      },
    })
  );
}

export async function removeConnection(connectionId: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { connectionId },
    })
  );
}

export async function listConnections(): Promise<string[]> {
  const res = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
      ProjectionExpression: 'connectionId',
    })
  );
  return (res.Items ?? []).map((i) => i.connectionId as string);
}

