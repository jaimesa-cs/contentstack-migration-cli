import Stack from "./stack.js";

const handleContentTypeDependencies = (obj: object): Stack<any> => {
  const stack = new Stack<any>();

  //   for (const [k, v] of Object.entries(obj)) {
  //     if (
  //       typeof v === "object" &&
  //       v.hasOwnProperty("type") &&
  //       v["type"] === "doc"
  //     ) {
  //       obj[k] = flattenObj(v);
  //     } else if (typeof v === "object") {
  //       if (Array.isArray(v)) {
  //         const newArray = [];

  //         for (let i = 0; i < v.length; i++) {
  //           const subObj = v[i];
  //           if (
  //             typeof subObj === "object" &&
  //             subObj.hasOwnProperty("type") &&
  //             subObj["type"] === "doc"
  //           ) {
  //             newArray.push(flattenObj(subObj));
  //           } else {
  //             flattenJson(v[i]);
  //             newArray.push(v[i]);
  //           }
  //         }
  //         // console.log(">>> New Array", newArray);
  //         obj[k] = newArray;
  //       } else {
  //         flattenJson(v);
  //       }

  //       flattenJson(v);
  //     }
  //   }
  return stack;
};
