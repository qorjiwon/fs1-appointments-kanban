.PHONY: build-AppointmentsFunction build-WebSocketConnectFunction build-WebSocketDisconnectFunction

# SAM sets ARTIFACTS_DIR; compiled JS + node_modules must be copied there for Lambda.
build-AppointmentsFunction build-WebSocketConnectFunction build-WebSocketDisconnectFunction:
	npm ci && npm run build
	mkdir -p "$(ARTIFACTS_DIR)"
	cp -r dist "$(ARTIFACTS_DIR)/"
	cp -r node_modules "$(ARTIFACTS_DIR)/"
	cp package.json package-lock.json "$(ARTIFACTS_DIR)/"
