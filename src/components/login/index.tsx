import * as React from 'react';
import { useState } from 'react';
import Firebase from '../../workers/firebase';
import { setCookie } from '../../helpers';
import { useNavigationContainer } from '../navigation/NavigationContainer';
import { useSignUpContainer } from '../signup/SignUpContainer';

const Login: React.FunctionComponent = ({}) => {
 
  const { 
    email, 
    password,
    setEmail,
    setPassword,
    loading, 
    setLoading,
    error, 
    setError,
    setScreen
  } = useSignUpContainer();

  const { setLoggedIn } = useNavigationContainer()
  const handleLogin = async (event: React.FormEvent<HTMLElement>) => {
    event.preventDefault();
    // setSignInText('Signing In...');
    setLoading();
    if (!(email && password)) {
      setError('Please fill in email and password');
      // setSignInText('Sign In');
      // setLoading(false);
      return;
    }

    let isError = false;
    Firebase.login(Firebase.EMAIL, { email, password })
      .catch((result:any) => {
        setError(result.message);
        setLoading();
        isError = true;
      })
      .then((result: { message: any; user: { uid: string } }) => {
        if (isError) {
          return;
        }
        console.log(result);
        setCookie('id_token', result.user.uid);
        setLoggedIn(true);
        setScreen('home');
        // axios
        //   .post('/api/user', { data: { firebase: result.user } })
        //   .then((res: AxiosResponse) => {
        //     const user = res.data;
        //     if (user.admin) {
        //       setCookie('id_token_a', 'true');
        //     }
        //   });
      });
  };
  return (
    <React.Fragment>
      <div className={'mt-4 text-center'}>
        <h1 className="mb0 mt3 pt3">Login</h1>
        <h4 className="gray mt0">
          Don't have an account?{' '}
          <span>
            <div onClick={()=>setScreen('signup')} className="white">
              Sign up
            </div>
          </span>
        </h4>
        <form className="mw6 center mv5">
          <div className="mv3">
            <div className="mv3 tl ba-hover  ">
              <small className=" db pl2 pt2 pb1"> Email Address</small>
              <input
                className="pl2 pb2 input-reset bn  w-90"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.currentTarget.value);
                  setError('');
                }}
              />
            </div>
          </div>
          <div className="mv3 tl ba-hover  ">
            <small className=" db pl2 pt2 pb1"> Password</small>
            <input
              className="pl2 pb2 input-reset bn  w-90"
              type="password"
              value={password}
              onChange={(event) => {
                setError('');
                setPassword(event.currentTarget.value);
              }}
            />
          </div>
          <small id="name-desc" className="hljs-strong f6 db mv3">
            {error}
          </small>
          <div className="mv3 tl pv2">
            <input type="checkbox" />
            <label className="pl2">
              Subscribe to Social Ticketing Newsletter
            </label>
          </div>
          <a
            onClick={handleLogin}
            className="b--white dib dim noselect fl br-100 b--solid pa2 ph4 f4 fw5"
          >
            {loading && <i className="fa fa-spinner fa-spin mr2" />}
            {loading ? 'Logging in...' : 'Login'}
          </a>

          <div className="mt4 tl dib pt3">
            <a className="white b" href="">
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </React.Fragment>
  );
};

export default Login;
