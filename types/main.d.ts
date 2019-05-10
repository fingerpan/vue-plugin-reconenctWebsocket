
export interface BeforeSendHook {
  (options: SendOptions, callback: (...args: any[]) => void): void;
}


export interface BeforeEmitHook {
  (...args: any[]): false | SocketEvent;
}


export interface SocketEvent {
  type: string;
  data: any;
  [propName: string]: any
}



export interface Config {
  protocol: string | string[] | undefined;
  reconnect: boolean;
  autoconnect: boolean;
  reconnectTime: number;
  binaryType?: BinaryType;
  beforeSendHook?: BeforeSendHook;
  beforeEmitHook?: BeforeEmitHook
}



export interface SendOptions {
  data: any;
  rep?: string;
  timeout?: number;
  retry?: boolean;
}


declare class SocketClass {

  /**
   * @constructorg
   */
  constructor(url: string, config: Config);

  // version
  static version?:string;



  // ---------------------------------------
  // native static property
  // ---------------------------------------

  /**
   * static connect state. 
   * more info 
   */
  static readonly CONNECTING: number;
  static readonly OPEN: number;
  static readonly CLOSING: number;
  static readonly CLOSED: number;



  // ---------------------------------------
  // native property
  // ---------------------------------------

  public  binaryType: BinaryType;
  public readonly bufferedAmount: number;
  public readonly extensions: ExtensionScriptApis;
  public readonly protocol :string;
  public readonly readyState: number;


  static defaultConfig: Config
  config: Config;
  beforeSendHook?: BeforeSendHook;
  beforeEmitHook?: BeforeEmitHook;


  
  // ---------------------------------------
  // public methods
  // ---------------------------------------

  public send (sendData: any, options: SendOptions): Promise<any>;
  public connect (url?:string): void;
  public reconnect (url?:string): boolean | void;
  public close (code?:number, reason?:string):void;
}

export default SocketClass