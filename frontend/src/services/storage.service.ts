export const StorageService = {
  uploadImage: async (file: File): Promise<string> => {
    // Mock implementation - replace with actual storage service
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }
};