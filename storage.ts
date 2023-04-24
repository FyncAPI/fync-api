let inited = false;
// let b2_upload_url = "";
// let b2_upload_auth_token = "";
// let b2_download_url = "";

export const initb2 = async () => {
  const id_and_key = Deno.env.get("B2KEYID")! + ":" + Deno.env.get("B2APPKEY")!;
  const basic_auth_string = "Basic " + btoa(id_and_key);

  const b2_auth_url =
    "https://api.backblazeb2.com/b2api/v2/b2_authorize_account";

  const b2_auth_headers = new Headers();
  b2_auth_headers.append("Authorization", basic_auth_string);
  const b2_auth_response = await fetch(b2_auth_url, {
    method: "GET",
    headers: b2_auth_headers,
  });

  const b2_auth_json = await b2_auth_response.json();

  // console.log(b2_auth_json);

  const b2_api_url = b2_auth_json.apiUrl;
  const b2_download_url = b2_auth_json.downloadUrl;
  const b2_auth_token = b2_auth_json.authorizationToken;
  const b2_bucket_id = Deno.env.get("B2BUCKETID")!;

  const b2_get_upload_url = b2_api_url + "/b2api/v2/b2_get_upload_url";

  const b2_upload_headers = new Headers();
  b2_upload_headers.append("Authorization", b2_auth_token);

  const b2_upload_response = await fetch(b2_get_upload_url, {
    method: "POST",
    headers: b2_upload_headers,
    body: JSON.stringify({
      bucketId: b2_bucket_id,
    }),
  });

  const b2_upload_json = await b2_upload_response.json();
  console.log(b2_upload_json && "b2 inited");

  const b2_upload_url = b2_upload_json.uploadUrl;
  const b2_upload_auth_token = b2_upload_json.authorizationToken;

  inited = true;
  return {
    b2_upload_url,
    b2_upload_auth_token,
    b2_download_url,
  };
};

const getCredentials = async () => {
  let up = "";
  let auth = "";
  let down = "";
  if (!inited) {
    const { b2_upload_url, b2_upload_auth_token, b2_download_url } =
      await initb2();

    up = b2_upload_url;
    auth = b2_upload_auth_token;
    down = b2_download_url;
  }

  return {
    b2_upload_url: up,
    b2_upload_auth_token: auth,
    b2_download_url: down,
  };
};
export const UploadFile = async (file: File, name?: string) => {
  const { b2_upload_url, b2_upload_auth_token, b2_download_url } =
    await getCredentials();
  // return "locally developing";
  const sha1 = await crypto.subtle
    .digest("SHA-1", await file.arrayBuffer())
    .then((hash) =>
      Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    );

  console.log(sha1);

  const b2_upload_headers = new Headers();
  b2_upload_headers.append("Authorization", b2_upload_auth_token);
  b2_upload_headers.append(
    "X-Bz-File-Name",
    encodeURIComponent(
      (name || file.name) + Date.now() + "." + file.type.split("/")[1]
    )
  );

  b2_upload_headers.append("X-Bz-Content-Sha1", sha1);
  b2_upload_headers.append("Content-Type", file.type);
  b2_upload_headers.append("Content-Length", file.size.toString());

  const b2_upload_response = await fetch(b2_upload_url, {
    method: "POST",
    headers: b2_upload_headers,
    body: file,
  });

  const b2_upload_json = await b2_upload_response.json();

  console.log(b2_upload_json);
  const url =
    b2_download_url +
    "/file/" +
    encodeURIComponent(
      Deno.env.get("B2BUCKETNAME")! + "/" + b2_upload_json.fileName
    );

  console.log(url);

  return url;
};
