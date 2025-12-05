import { Button, Flex } from "@chakra-ui/react";
import React from "react";
import AuthModel from "../../components/Modal/Auth/AuthModel";
import AuthButtons from "./AuthButtons";
import Icons from "./Icons";
import UserMenu from "./UserMenu";
import { BasicUser } from "../../atoms/userAtom";

type RightContentProps = {
  user?: BasicUser | null;
};

const RightContent: React.FC<RightContentProps> = ({ user }) => {
  return (
    <>
      <AuthModel />
      <Flex justify="center" align="center">
        {user ? <Icons /> : <AuthButtons />}
        <UserMenu user={user} />
      </Flex>
    </>
  );
};
export default RightContent;
