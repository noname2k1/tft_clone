const customFetch = async (
  url = "",
  successCallBack = () => {},
  fallBack = () => {},
  method = "GET",
  formData = {}
) => {
  const initRequest = {
    method,
  };
  if (method !== "GET") {
    initRequest.headers = {
      "Content-Type": "application/json", // Nếu gửi JSON
    };
    initRequest.body = JSON.stringify(formData);
  }
  try {
    const response = await fetch(
      import.meta.env.VITE_SERVER_PREFIX + url,
      initRequest
    );
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    // console.log(data);
    successCallBack(data);
  } catch (err) {
    console.log(err);
    fallBack(err);
  }
};

export { customFetch };
