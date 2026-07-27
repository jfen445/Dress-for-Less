"use client";

import * as React from "react";
import { RadioGroup } from "@headlessui/react";
import {
  CartType,
  DressType,
  ImageType,
  Sizes,
  UserType,
} from "../../../common/types";
import { DeliveryType } from "../../../common/enums/DeliveryType";
import ImageSelector from "./ImageSelector";
import Button from "@/components/Button";
import Calendar from "./Calendar";
import { getUser } from "@/api/user";
import { useSession } from "next-auth/react";
import Toast, { ToastType, ToastVariant } from "../Toast";
import { addToCart } from "@/api/cart";
import CoverFlow from "../Swiper";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useCartContext } from "@/context/CartContext";
import Tooltip from "@/components/Tooltip";

interface ProductProps {
  dress: DressType;
}

const Product = ({ dress }: ProductProps) => {
  const { data: session } = useSession();
  const { refreshCart } = useCartContext();
  const { getItems, setItems } = useLocalStorage<CartType[]>("localCart");
  const [size, setSize] = React.useState<string>("");
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [deliveryType, setDeliveryType] = React.useState<DeliveryType>(
    DeliveryType.Delivery,
  );
  const [isAddedToCart, setIsAddedToCart] = React.useState<boolean>(false);
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: ToastVariant.SUCCESS,
    show: false,
  });
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const sizes = React.useMemo<Sizes>(() => {
    const dressSizes = (({ xs, s, m, l, xl }) => ({
      xs,
      s,
      m,
      l,
      xl,
    }))(dress as any);

    return Object.fromEntries(
      Object.entries(dressSizes).filter(([_, v]) => v != null && Number(v) > 0),
    );
  }, [dress]);

  const images = React.useMemo<ImageType[]>(() => {
    return dress.images.reduce(function (
      acc: ImageType[], // Set the accumulator type to an array of ImageType
      cur: string, // Assuming cur is a string, the image source
    ): ImageType[] {
      // The return type should be ImageType[]
      var o: ImageType = {
        src: cur,
        alt: dress.name + cur, // Alt text is constructed with the name + image URL
      };
      acc.push(o); // Push the new object to the array
      return acc;
    }, []);
  }, [dress]);

  const sizeOptions = React.useCallback(() => {
    const obj = Object.keys(sizes).map((item) => item.toUpperCase());

    return obj;
  }, [sizes]);

  React.useEffect(() => {
    if (isAddedToCart) setIsAddedToCart(false);
  }, [selectedDate, size, deliveryType, isAddedToCart]);

  const addDressToCart = async () => {
    setIsLoading(true);

    const user = await getUser(session?.user.email ?? "")
      .then((res) => {
        if (res === undefined) return null;
        const r = res.data as unknown as UserType;
        return r;
      })
      .catch((err) => console.error(err));

    if (!user) {
      setToast({
        message: "An error occurred while adding to cart",
        variant: ToastVariant.ERROR,
        show: true,
      });
      setIsLoading(false);
      return;
    }

    const cartItem: CartType = {
      dressId: dress._id,
      userId: user?._id,
      dateBooked: selectedDate,
      size: size,
      deliveryType: deliveryType,
    };

    if (!session || !user) {
      const localCart = getItems() || ([] as CartType[]);

      const itemAlreadyInCart = localCart.some(
        (item) =>
          item.dressId === cartItem.dressId &&
          item.dateBooked === cartItem.dateBooked &&
          item.size === cartItem.size,
      );

      if (itemAlreadyInCart) {
        setToast({
          message: "Item already in cart",
          variant: ToastVariant.WARNING,
          show: true,
        });
      } else {
        setItems([...localCart, cartItem]);
        setToast({
          message: "Added to cart",
          variant: ToastVariant.SUCCESS,
          show: true,
        });
        refreshCart();
        setIsAddedToCart(true);
      }
    } else {
      await addToCart(cartItem)
        .then((data) => {
          setToast({
            message: data?.data.message,
            variant: ToastVariant.SUCCESS,
            show: true,
          });
          refreshCart();
        })
        .catch((err) => {
          setToast({
            message: err.message,
            variant: ToastVariant.WARNING,
            show: true,
          });
        })
        .finally(() => {
          setIsAddedToCart(true);
        });
    }

    setIsLoading(false);
  };

  const Dropdown = () => {
    if (!size) {
      setSize(sizeOptions()[0]);
    }

    return (
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium leading-6 text-gray-900 mt-4"
        >
          Select a size
        </label>
        <select
          id="location"
          name="location"
          onChange={(e) => setSize(e.target.value)}
          className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
        >
          {sizeOptions().map((item) => (
            <option key={item} selected={item == size}>
              {item}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const DeliverySelector = () => {
    const selectDeliveryType = (type: DeliveryType) => {
      setDeliveryType(type);
      setSelectedDate("");
    };

    return (
      <div className="mt-4">
        <RadioGroup className="flex items-center gap-1.5 text-sm font-medium leading-6 text-gray-900">
          Delivery or Pick Up
          <Tooltip
            position="right"
            mobilePosition="bottom"
            align="start"
            content={
              <p>
                We deliver nationwide across New Zealand, or you can pick up
                in person from our Albany, Auckland studio.
              </p>
            }
          />
        </RadioGroup>
        <div className="mt-2 flex gap-3">
          <Button
            type="button"
            variant={
              deliveryType === DeliveryType.Delivery ? "primary" : "tertiary"
            }
            onClick={() => selectDeliveryType(DeliveryType.Delivery)}
          >
            Delivery
          </Button>
          <Button
            type="button"
            variant={
              deliveryType === DeliveryType.Pickup ? "primary" : "tertiary"
            }
            onClick={() => selectDeliveryType(DeliveryType.Pickup)}
          >
            {"Pick Up (Auckland)"}
          </Button>
        </div>
        <RadioGroup className="mt-4 flex items-center gap-1.5 text-sm font-medium text-gray-700">
          Booking Cut-Off Times
          <Tooltip
            position="right"
            mobilePosition="bottom"
            align="start"
            content={
              <div className="space-y-2">
                <p>
                  <strong>Postage</strong>
                  <br />
                  For Friday, Saturday and Sunday events, the postal cut-off is
                  Tuesday at 8:00pm.
                  <br />
                  For weekday events (not including Friday), bookings usually
                  close four working days before the event at 8:00pm.
                </p>
                <p>
                  <strong>Pickup</strong>
                  <br />
                  Pickup bookings close two days before your event date at
                  8:00pm (NZT). Pickup instructions will usually be emailed the
                  day before your garment is ready to collect.
                </p>
                <p>
                  Need something last minute? Send us a message on Instagram or
                  email us, and we&apos;ll try our best to help you out!
                </p>
              </div>
            }
          />
        </RadioGroup>
        <p className="mt-2 text-xs text-gray-500">
          {deliveryType === DeliveryType.Delivery
            ? "Select the date of your event, your dress will usually arrive 1-2 days prior to this."
            : "Select the date of your event, your dress will usually be ready for pick up one day prior to this."}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-white">
      <Toast toast={toast} setToast={setToast} href={"/cart"} />
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
        {/* Product details */}
        <div className="lg:max-w-lg lg:self-end">
          <div className="mt-4">
            <p className="text-sm text-gray-500">{dress?.brand}</p>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {dress?.name}
            </h1>
          </div>

          <section aria-labelledby="information-heading" className="mt-4">
            <h2 id="information-heading" className="sr-only">
              Product information
            </h2>

            <div className="flex items-center">
              <p className="text-lg text-gray-900 sm:text-xl">
                ${dress?.price}{" "}
                <text className="text-xs text-gray-400">
                  RRP: ${dress?.rrp}
                </text>
              </p>
            </div>

            <div className="mt-4 space-y-6">
              <p className="text-base text-gray-500">{dress?.description}</p>
            </div>
          </section>
          <section aria-labelledby="options-heading">
            <h2 id="options-heading" className="sr-only">
              Product options
            </h2>

            <div className="mt-5">
              <RadioGroup className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                Stretch: {dress?.stretch}
                <Tooltip
                  position="right"
                  mobilePosition="bottom"
                  align="start"
                  content={
                    <div className="space-y-2">
                      <p>
                        We rate every dress from 1-3 based on how much the
                        fabric stretches to help you find the best fit.
                      </p>
                      <p>
                        <strong>1 – Minimal Stretch</strong>
                        <br />
                        Little to no stretch. We recommend choosing your usual
                        size.
                      </p>
                      <p>
                        <strong>2 – Moderate Stretch</strong>
                        <br />
                        Some stretch in the fabric. May comfortably fit around
                        half a size up or down.
                      </p>
                      <p>
                        <strong>3 – High Stretch</strong>
                        <br />
                        Very stretchy fabric. Can often fit one full size up or
                        down, depending on the style.
                      </p>
                      <p>
                        Please note: Every dress fits differently. Any
                        additional sizing information, fit advice, or
                        style-specific details will be listed under the Notes
                        section on each dress.
                      </p>
                      <p>
                        If you&apos;re still unsure about sizing, feel free to
                        email us or book a try-on appointment - we&apos;re
                        always happy to help you find the perfect fit!
                      </p>
                    </div>
                  }
                />
              </RadioGroup>
            </div>

            {dress?.condition && (
              <div className="mt-2">
                <RadioGroup className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  Condition: {dress.condition}
                  <Tooltip
                    position="right"
                    mobilePosition="bottom"
                    content={
                      <div className="space-y-2">
                        <p>
                          We carefully inspect every dress before and after each
                          rental and assign it a Condition Rating based on its
                          overall wear.
                        </p>
                        <p>
                          <strong>Excellent</strong>
                          <br />
                          Like new with little to no visible signs of wear.
                        </p>
                        <p>
                          <strong>Great</strong>
                          <br />
                          Minor signs of wear from previous rentals that are not
                          noticeable when worn.
                        </p>
                        <p>
                          <strong>Good</strong>
                          <br />
                          Some visible signs of wear, such as light fabric wear
                          or small imperfections, but the dress is still in
                          great wearable condition.
                        </p>
                        <p>
                          <strong>Okay</strong>
                          <br />
                          More noticeable signs of wear or minor imperfections.
                          These dresses are still fully wearable and suitable
                          for hire, but have been priced accordingly.
                        </p>
                        <p>
                          Please note: As a designer dress rental business, many
                          of our garments have been loved by previous customers.
                          We would not aim to rent a dress with damage that
                          significantly impacts its appearance or wearability.
                          Any dress-specific imperfections will be disclosed in
                          the Notes section on the product page.
                        </p>
                      </div>
                    }
                  />
                </RadioGroup>
              </div>
            )}

            {dress?.notes && (
              <div className="mt-5">
                <RadioGroup className="block text-sm italic text-gray-700">
                  Notes: {dress?.notes}
                </RadioGroup>
              </div>
            )}

            {/* <ImageSelector images={images} classname="md:hidden py-10" /> */}
            <CoverFlow images={images} classname="lg:hidden" />

            <Dropdown />

            <DeliverySelector />

            <Calendar
              setSelectedDate={setSelectedDate}
              sizes={sizes}
              selectedSize={size}
              deliveryType={deliveryType}
              dressId={dress._id}
            />

            <div className="mt-10">
              <Button
                className="flex w-full items-center justify-center"
                disabled={
                  selectedDate === "" ||
                  size == "" ||
                  isAddedToCart ||
                  isLoading
                }
                onClick={() => addDressToCart()}
              >
                {isAddedToCart ? "Added to cart" : "Add to cart"}
              </Button>
            </div>
          </section>
        </div>
        <ImageSelector images={images} classname="hidden lg:block" />
      </div>
    </div>
  );
};

export default Product;
