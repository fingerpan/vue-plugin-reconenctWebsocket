
/**
 * error info
 */
export default {
  // websocket 不支持
  NO_SUPPORT: "NO_SUPPORT: Failed to construct 'WebSocket': The browser is not support WebSocket",
  // 参数缺少
  PARAMETERS_LACK: "PARAMETERS_LACK: Failed to construct 'WebSocket': The browser is not support WebSocket",
  // 
  SEND_PARAMETERS_LACK: "Failed to execute 'send' on 'WebSocket': 1 argument required, but only 0 present.",
  INVALID_STATE_ERR_NOTOPEN: "Failed to execute 'send' on 'WebSocket': The connection is not currently OPEN",
  INVALID_STATE_ERR_CONNECTING: "Failed to execute 'send' on 'WebSocket': WebSocket is connecting",
  SEND_ERR: "Failed to execute 'send' on 'WebSocket': unkown reason"
}