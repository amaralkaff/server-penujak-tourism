declare module 'shimmer' {
    function shimmer(options: {
      module: any;
      name: string | string[];
      wrapper: (original: Function) => Function;
    }): void;
    
    namespace shimmer {
      function wrap<T>(nodule: T, name: keyof T, wrapper: (original: T[keyof T]) => T[keyof T]): void;
      function massWrap<T>(nodules: T[], names: (keyof T)[], wrapper: (original: T[keyof T]) => T[keyof T]): void;
      function unwrap<T>(nodule: T, name: keyof T): void;
      function massUnwrap<T>(nodules: T[], names: (keyof T)[]): void;
    }
    
    export = shimmer;
  }