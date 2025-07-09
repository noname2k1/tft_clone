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

const sendMessageChangeLineupToEnemy = (champs) => {
  const champsInBf = [];
  const champsInBench = [];
  champs.forEach((obj, index) => {
    let champArray = obj.benchIndex !== -1 ? champsInBench : champsInBf;
    champArray.push({
      [index]: obj,
    });
  });
  console.log("callApi.js/sendMessageChangeLineupToEnemy: ", {
    champsInBench,
    champsInBf,
  });
};

export { customFetch, sendMessageChangeLineupToEnemy };
