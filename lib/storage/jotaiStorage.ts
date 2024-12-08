import AsyncStorage from "@react-native-async-storage/async-storage";
import { createJSONStorage } from "jotai/utils";
import z, { ZodType } from "zod";

export const createStorage = <Value extends ZodType>(schema: Value) =>
  createJSONStorage<z.infer<Value>>(() => ({
    getItem: async (key: string) => {
        const value = await AsyncStorage.getItem(key);

        if (value === null) return undefined;
        console.log({key}, JSON.parse(value));
        console.log(typeof JSON.parse(value));
        
        return schema.parse(JSON.parse(value));
    },
    setItem: async (key: string, value: z.infer<Value>) => {
        await AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string) => {
        await AsyncStorage.removeItem(key);
    },
  }));
