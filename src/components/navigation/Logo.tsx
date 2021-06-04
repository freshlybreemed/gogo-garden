import React from 'react';
import { Soulector } from '../icons';
import logo from '../../images/logo@2x.png'; // Tell webpack this JS file uses this image

export default function Logo() {
  return (
    <React.Fragment>
      <img className=" w-40 " src={logo} />
    </React.Fragment>
  );
}
