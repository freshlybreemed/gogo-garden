import Image from 'next/image';

export default function Logo() {
  return (
    <Image
      className=" w-40 "
      src="/images/logo@2x.png"
      width={3720}
      height={535}
      alt="Tha Garden"
      priority
    />
  );
}
