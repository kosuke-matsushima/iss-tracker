export type ISSApiResponse = {
  iss_position: {
    latitude: string;
    longitude: string;
  };
  timestamp: number;
  message: string;
};

export type ISSPosition = {
  latitude: number;
  longitude: number;
  timestamp: number;
};
