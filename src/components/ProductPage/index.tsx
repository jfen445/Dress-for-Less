"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { RadioGroup } from "@headlessui/react";
import {
  CartType,
  DressType,
  ImageType,
  Sizes,
  UserType,
} from "../../../common/types";
import ImageSelector from "./ImageSelector";
import Button from "@/components/Button";
import Calendar from "./Calendar";
import { getUser } from "@/api/user";
import { useSession } from "next-auth/react";
import Toast, { ToastType } from "../Toast";
import { addToCart } from "@/api/cart";
import Spinner from "../Spinner";
import CoverFlow from "../Swiper";
import { useGlobalContext } from "@/context/GlobalContext";
import useLocalStorage from "@/hooks/useLocalStorage";

const Product = () => {
  const { getDressWithId } = useGlobalContext();
  const { data: session } = useSession();
  const { getItems, setItems } = useLocalStorage<CartType[]>("localCart");
  const [dress, setDress] = React.useState<DressType>();
  const [sizes, setSizes] = React.useState<Sizes>({});
  const [size, setSize] = React.useState<string>("");

  const [images, setImages] = React.useState<ImageType[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<string>("");
  const [toast, setToast] = React.useState<ToastType>({
    message: "",
    variant: "success",
    show: false,
  });
  const params = useParams<{ id: string }>();

  const sizeOptions = React.useCallback(() => {
    const obj = Object.keys(sizes).map((item) => item.toUpperCase());

    return obj;
  }, [sizes]);

  React.useEffect(() => {
    if (params) {
      const getProductDetails = async () => {
        const currentDress = getDressWithId(params.id);
        if (currentDress) {
          setDress(currentDress);
          const dressSizes = (({ xs, s, m, l, xl }) => ({
            xs,
            s,
            m,
            l,
            xl,
          }))(currentDress as any);

          let pickedSizes = Object.fromEntries(
            Object.entries(dressSizes).filter(([_, v]) => v != null)
          );

          setSizes(pickedSizes);

          var obj: ImageType[] = currentDress.images.reduce(function (
            acc: ImageType[], // Set the accumulator type to an array of ImageType
            cur: string, // Assuming cur is a string, the image source
            i: number // Index is a number
          ): ImageType[] {
            // The return type should be ImageType[]
            var o: ImageType = {
              src: cur,
              alt: currentDress.name + cur, // Alt text is constructed with the name + image URL
            };
            acc.push(o); // Push the new object to the array
            return acc;
          }, []);

          setImages(obj);
        }

        // await getDress(params.id).then((data) => {
        //   setDress(data);
        //   const dressSizes = (({ xs, s, m, l, xl }) => ({
        //     xs,
        //     s,
        //     m,
        //     l,
        //     xl,
        //   }))(data);

        //   let pickedSizes = Object.fromEntries(
        //     Object.entries(dressSizes).filter(([_, v]) => v != null)
        //   );

        //   setSizes(pickedSizes);

        //   var obj = data.images.reduce(function (
        //     acc: { [x: string]: any },
        //     cur: any,
        //     i: string | number
        //   ) {
        //     var o = { src: cur, alt: data.name + cur };
        //     acc[i] = o;
        //     return acc;
        //   },
        //   []);

        //   setImages(obj);
        // });
      };

      getProductDetails();
    }
  }, [getDressWithId, params]);

  const addDressToCart = async () => {
    const user = await getUser(session?.user.email ?? "")
      .then((res) => {
        if (res === undefined) return;
        const r = res.data as unknown as UserType;
        return r;
      })
      .catch((err) => console.error(err));

    if (!params?.id) {
      setToast({
        message: "An error occurred while adding to cart",
        variant: "error",
        show: true,
      });
      return;
    }

    const cartItem: CartType = {
      dressId: params?.id,
      userId: user?._id,
      dateBooked: selectedDate,
      size: size,
    };

    if (!session || !user) {
      const localCart = getItems() || ([] as CartType[]);

      const itemAlreadyInCart = localCart.some(
        (item) => JSON.stringify(item) === JSON.stringify(cartItem)
      );

      if (itemAlreadyInCart) {
        setToast({
          message: "Item already in cart",
          variant: "warning",
          show: true,
        });
      } else {
        setItems([...localCart, cartItem]);
        setToast({
          message: "Added to cart",
          variant: "success",
          show: true,
        });
      }
    } else {
      await addToCart(cartItem)
        .then((data) => {
          setToast({
            message: data?.data.message,
            variant: "success",
            show: true,
          });
        })
        .catch((err) => {
          console.log(err);
          setToast({
            message: err?.data.message,
            variant: "warning",
            show: true,
          });
        });
    }
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

  return (
    <div className="bg-white">
      <Toast toast={toast} setToast={setToast} title={toast.message} />
      {!dress ? (
        <div className="h-screen flex items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:grid lg:max-w-7xl lg:grid-cols-2 lg:gap-x-8 lg:px-8">
          {/* Product details */}
          <div className="lg:max-w-lg lg:self-end">
            <div className="mt-4">
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
                <RadioGroup className="block text-sm font-medium text-gray-700">
                  Size on tag: {dress?.size}
                </RadioGroup>
                <RadioGroup className="block text-sm font-medium text-gray-700">
                  Stretch: {dress?.stretch}
                </RadioGroup>
                {dress && dress.recommendedSize ? (
                  <RadioGroup className="block text-sm font-medium text-gray-700">
                    Recommended Size: {dress?.recommendedSize.sort().join(", ")}
                  </RadioGroup>
                ) : null}
              </div>

              <div className="mt-5">
                <RadioGroup className="block text-sm italic text-gray-700">
                  Notes: {dress?.notes}
                </RadioGroup>
              </div>

              {/* <ImageSelector images={images} classname="md:hidden py-10" /> */}
              <CoverFlow images={images} classname="lg:hidden" />

              <Dropdown />

              <Calendar
                setSelectedDate={setSelectedDate}
                sizes={sizes}
                selectedSize={size}
              />

              <div className="mt-10">
                <Button
                  className="flex w-full items-center justify-center"
                  disabled={selectedDate === "" || size == ""}
                  onClick={() => addDressToCart()}
                >
                  Making a booking
                </Button>
              </div>
            </section>
          </div>
          <ImageSelector images={images} classname="hidden lg:block" />
        </div>
      )}
    </div>
  );
};

export default Product;
