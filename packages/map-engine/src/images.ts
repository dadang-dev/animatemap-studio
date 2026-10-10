import type { ImageAsset } from '@animatemap/project-schema';

type DecodedImage = {
  asset: ImageAsset;
  image: HTMLImageElement;
  ready: Promise<void>;
};
export class ImageResources {
  private entries = new Map<string, DecodedImage>();
  private required = new Set<string>();
  private disposed = false;
  constructor(
    private onReady: () => void,
    private onError: (error: Error) => void,
  ) {}
  use(assets: ImageAsset[]) {
    this.required = new Set(assets.map((asset) => asset.id));
    for (const [id, entry] of this.entries)
      if (
        !this.required.has(id) ||
        assets.find((asset) => asset.id === id)?.dataUrl !== entry.asset.dataUrl
      )
        this.entries.delete(id);
    for (const asset of assets) {
      if (this.entries.has(asset.id)) continue;
      const image = new Image();
      image.src = asset.dataUrl;
      const entry: DecodedImage = { asset, image, ready: Promise.resolve() };
      this.entries.set(asset.id, entry);
      entry.ready = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`Image ${asset.name} decoding timed out`)),
          10000,
        );
        void image
          .decode()
          .then(() => {
            if (
              image.naturalWidth !== asset.width ||
              image.naturalHeight !== asset.height
            )
              throw new Error('Decoded dimensions differ from asset metadata');
            resolve();
          })
          .catch((error: unknown) =>
            reject(
              new Error(
                `Image ${asset.name} cannot decode: ${error instanceof Error ? error.message : 'invalid pixels'}`,
              ),
            ),
          )
          .finally(() => clearTimeout(timer));
      });
      // Catch here for the asynchronous preview; ready() still receives the rejection.
      void entry.ready.then(
        () => {
          if (!this.disposed && this.entries.get(asset.id) === entry)
            try {
              this.onReady();
            } catch (error) {
              this.onError(
                error instanceof Error
                  ? error
                  : new Error('Image renderer update failed'),
              );
            }
        },
        (error: Error) => {
          if (!this.disposed && this.entries.get(asset.id) === entry)
            this.onError(error);
        },
      );
    }
  }
  get(id: string) {
    const image = this.entries.get(id)?.image;
    return image?.complete && image.naturalWidth ? image : undefined;
  }
  async ready() {
    await Promise.all(
      [...this.required].map((id) => this.entries.get(id)!.ready),
    );
  }
  dispose() {
    this.disposed = true;
    this.entries.clear();
    this.required.clear();
  }
}
