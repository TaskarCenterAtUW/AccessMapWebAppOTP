import fetchDirections, {
  DirectionsOptions,
  DirectionsResponse,
} from "./fetch-directions";

export interface SignaledDirectionsOptions extends DirectionsOptions {
  signal: AbortSignal;
}

const wrapped = (
  f: (options: DirectionsOptions) => Promise<DirectionsResponse>
) => {
  let controller: AbortController = null;

  return (options: SignaledDirectionsOptions): Promise<DirectionsResponse> => {
    if (controller !== null) {
      controller.abort();
    }
    controller = new AbortController();
    options.signal = controller.signal;
    return f(options).finally(() => {
      controller = null;
    });
  };
};

const selfCancelingFetchDirections = wrapped(fetchDirections);

export default selfCancelingFetchDirections;
