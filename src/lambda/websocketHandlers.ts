import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { addConnection, removeConnection } from '../websocket/connectionsRepository';

export const connectHandler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  if (connectionId) {
    await addConnection(connectionId);
  }
  return { statusCode: 200, body: 'connected' };
};

export const disconnectHandler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  if (connectionId) {
    await removeConnection(connectionId);
  }
  return { statusCode: 200, body: 'disconnected' };
};

