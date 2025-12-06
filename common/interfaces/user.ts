export interface IUser {
  mongoID?: string;
  name: string;
  email: string;
  password?: string;
  mobileNumber: string;
  instagramHandle?: string;
  photo: string;
}

export interface ICart {
  dressId: string;
  userId: string;
  dateBooked: string;
  size: string;
}

export interface IBooking {
  dressId: string;
  userId: string;
  dateBooked: string;
  blockOutPeriod: string[];
  price: number;
  address: IAddress;
  billingAddress: IAddress;
  deliveryType: string;
  tracking: string;
  isShipped: boolean;
  isReturned: boolean;
  paymentIntent: string;
  paymentSuccess: boolean;
  size: String;
}

export interface IAddress {
  address: string;
  suburb?: string;
  city?: string;
  country?: string;
  postCode?: string;
}
