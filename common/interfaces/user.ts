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
}

export interface IBooking {
  dressId: string;
  userId: string;
  dateBooked: string;
  blockOutPeriod: string[];
  address: string;
  city: string;
  country: string;
  postCode: string;
  tracking: string;
  isShipped: boolean;
  isReturned: boolean;
}
