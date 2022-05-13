import axios, { AxiosRequestConfig } from "axios";
import fs, { PathOrFileDescriptor } from "fs";
import { getComponentsFiles } from "./getComponentsFiles";

describe("getComponentsFiles()", () => {
  describe("passing an URL", () => {
    it("expects to fetch the file using axios", () => {
      const spy = jest
        .spyOn(axios, "get")
        .mockImplementation(
          (
            url: string,
            config?: AxiosRequestConfig<any> | undefined
          ): Promise<unknown> => {
            return new Promise((resolve) => {});
          }
        );
      getComponentsFiles("http://localhost", true);
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("passing a local file path", () => {
    it("expects to fetch the file using fs", () => {
      const spy = jest
        .spyOn(fs, "readFileSync")
        .mockImplementation(
          (
            filePath: PathOrFileDescriptor,
            encoding:
              | BufferEncoding
              | (any & { flag?: string | undefined })
              | null
              | undefined
          ): string => {
            return "done";
          }
        );
      getComponentsFiles("/route/to/file", false);
      expect(spy).toHaveBeenCalled();
    });
  });
});