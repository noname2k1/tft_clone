import { customFetch } from "~~/utils/callApi";

export const useItem = async (id, name, champUuid, succesCallback) => {
  // try {
  await customFetch(
    "items/use",
    (data) => succesCallback(data),
    (e) => {
      console.log(e);
    },
    "POST",
    {
      id,
      name,
      champUuid,
    }
  );
};
